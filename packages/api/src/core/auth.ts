import { randomBytes } from "node:crypto";
import type { Document } from "@nullcms/shared";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import type { StorageStrategy } from "../storage/strategy";

// User document type
export interface UserDocument extends Document {
	username: string;
	passwordHash: string;
	role: "admin" | "editor" | "viewer";
	lastLogin?: Date;
}

// Session document type
export interface SessionDocument extends Document {
	userId: string;
	expiresAt: Date;
}

// Authentication result types
export type AuthResult =
	| { success: true; userId: string; username: string; role: string }
	| { success: false; reason: string };

export type SessionValidationResult =
	| { valid: true; userId: string; username: string; role: string }
	| { valid: false; reason: string };

export class Auth {
	private storage: StorageStrategy;
	private isInitialized = false;

	// Collection names
	private readonly USER_COLLECTION = "users";
	private readonly SESSION_COLLECTION = "sessions";

	// Constants
	private readonly SESSION_EXPIRY_DAYS = 30;
	private readonly SESSION_RENEWAL_THRESHOLD_DAYS = 15;

	constructor(storage: StorageStrategy) {
		this.storage = storage;
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		// Ensure the storage itself is initialized
		await this.storage.initialize();

		// Ensure collections exist
		const collections = await this.storage.listCollections();

		if (!collections.includes(this.USER_COLLECTION)) {
			await this.storage.createCollection(this.USER_COLLECTION);

			// Seed default admin user if no users exist
			const userCount = await this.storage.count(this.USER_COLLECTION);
			if (userCount === 0) {
				await this.createUser("admin", "adminpassword", "admin");
			}
		}

		if (!collections.includes(this.SESSION_COLLECTION)) {
			await this.storage.createCollection(this.SESSION_COLLECTION);
		}

		this.isInitialized = true;
	}

	private async cleanupExpiredSessions(): Promise<void> {
		try {
			// Delete all sessions that have expired
			const now = new Date();
			const expiredSessions = await this.storage.find<SessionDocument>(
				this.SESSION_COLLECTION,
				{},
			);

			const toDelete = expiredSessions.filter(e => new Date(e.expiresAt) < now);

			for (const session of toDelete) {
				await this.storage.delete(this.SESSION_COLLECTION, {
					_id: session._id,
				});
			}
		} catch (error) {
			console.error("Failed to clean up expired sessions:", error);
		}
	}

	/**
	 * Creates a new user
	 */
	async createUser(
		username: string,
		password: string,
		role: "admin" | "editor" | "viewer" = "viewer",
	): Promise<string> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		// Validate username
		if (
			username.length < 3 ||
			username.length > 32 ||
			username.trim() !== username
		) {
			throw new Error(
				"Invalid username. Must be 3-32 characters and cannot start or end with whitespace.",
			);
		}

		// Check if username already exists
		const existingUser = await this.storage.findOne<UserDocument>(
			this.USER_COLLECTION,
			{ username } as Partial<UserDocument>,
		);

		if (existingUser) {
			throw new Error("Username already taken");
		}

		// Validate password
		if (password.length < 8) {
			throw new Error("Password must be at least 8 characters long");
		}

		// Hash password
		const passwordHash = await this.hashPassword(password);

		// Create user
		const newUser = await this.storage.insert<UserDocument>(
			this.USER_COLLECTION,
			{
				username,
				passwordHash,
				role,
				lastLogin: new Date(),
			},
		);

		return newUser._id;
	}

	/**
	 * Authenticates a user and creates a session
	 */
	async login(
		username: string,
		password: string,
	): Promise<AuthResult & { token?: string }> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		// Find user by username
		const user = await this.storage.findOne<UserDocument>(
			this.USER_COLLECTION,
			{ username } as Partial<UserDocument>,
		);

		if (!user) {
			return { success: false, reason: "Invalid username or password" };
		}

		// Verify password
		const passwordValid = await this.verifyPassword(
			password,
			user.passwordHash,
		);

		if (!passwordValid) {
			return { success: false, reason: "Invalid username or password" };
		}

		// Update last login
		const now = new Date();
		await this.storage.update(
			this.USER_COLLECTION,
			{ _id: user._id } as Partial<UserDocument>,
			{ lastLogin: now } as Partial<UserDocument>,
		);

		// Create session token and session
		const token = this.generateSessionToken();
		try {
			await this.createSession(token, user._id);
			await this.cleanupExpiredSessions();

			return {
				success: true,
				userId: user._id,
				username: user.username,
				role: user.role,
				token,
			};
		} catch (error) {
			console.error("Failed to create session:", error);
			return { success: false, reason: "Failed to create session" };
		}
	}

	/**
	 * Validates a session token
	 */
	async validateSession(token: string): Promise<SessionValidationResult> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		if (!token) {
			return { valid: false, reason: "No session token provided" };
		}

		// Hash token to get session ID
		const sessionId = this.hashToken(token);

		// Look up session
		const session = await this.storage.findOne<SessionDocument>(
			this.SESSION_COLLECTION,
			{ _id: sessionId } as Partial<SessionDocument>,
		);

		if (!session) {
			return { valid: false, reason: "Invalid session" };
		}

		// Check if session has expired
		const now = new Date();
		const expiresAt = new Date(session.expiresAt);
		if (expiresAt < now) {
			// Delete expired session
			await this.storage.delete(this.SESSION_COLLECTION, {
				_id: sessionId,
			} as Partial<SessionDocument>);
			return { valid: false, reason: "Session expired" };
		}

		// Get user info
		const user = await this.storage.findOne<UserDocument>(
			this.USER_COLLECTION,
			{ _id: session.userId } as Partial<UserDocument>,
		);

		if (!user) {
			// User no longer exists, delete session
			await this.storage.delete(this.SESSION_COLLECTION, {
				_id: sessionId,
			} as Partial<SessionDocument>);
			return { valid: false, reason: "User not found" };
		}

		// Check if we should extend session
		const renewalThreshold = new Date(
			now.getTime() - this.SESSION_RENEWAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
		);

		if (expiresAt <= renewalThreshold) {
			// Extend session
			const newExpiryDate = new Date(
				now.getTime() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
			);
			await this.storage.update(
				this.SESSION_COLLECTION,
				{ _id: sessionId } as Partial<SessionDocument>,
				{ expiresAt: newExpiryDate } as Partial<SessionDocument>,
			);
		}

		return {
			valid: true,
			userId: user._id,
			username: user.username,
			role: user.role,
		};
	}

	/**
	 * Logs out by invalidating a session
	 */
	async logout(token: string): Promise<boolean> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		// Hash token to get session ID
		const sessionId = this.hashToken(token);

		// Delete session
		const deleted = await this.storage.delete(this.SESSION_COLLECTION, {
			_id: sessionId,
		} as Partial<SessionDocument>);

		return deleted > 0;
	}

	/**
	 * Logs out all sessions for a user
	 */
	async logoutAll(userId: string): Promise<number> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		// Get all sessions for user
		const sessions = await this.storage.find<SessionDocument>(
			this.SESSION_COLLECTION,
			{ userId } as Partial<SessionDocument>,
		);

		// Delete all sessions
		let count = 0;
		for (const session of sessions) {
			const deleted = await this.storage.delete(this.SESSION_COLLECTION, {
				_id: session._id,
			} as Partial<SessionDocument>);
			count += deleted;
		}

		return count;
	}

	/**
	 * Updates a user's password
	 */
	async updatePassword(
		userId: string,
		currentPassword: string,
		newPassword: string,
	): Promise<boolean> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		// Validate new password
		if (newPassword.length < 8) {
			throw new Error("Password must be at least 8 characters long");
		}

		// Get user
		const user = await this.storage.findOne<UserDocument>(
			this.USER_COLLECTION,
			{ _id: userId } as Partial<UserDocument>,
		);

		if (!user) {
			return false;
		}

		// Verify current password
		const passwordValid = await this.verifyPassword(
			currentPassword,
			user.passwordHash,
		);

		if (!passwordValid) {
			return false;
		}

		// Hash new password
		const passwordHash = await this.hashPassword(newPassword);

		// Update password
		await this.storage.update(
			this.USER_COLLECTION,
			{ _id: userId } as Partial<UserDocument>,
			{ passwordHash } as Partial<UserDocument>,
		);

		// Invalidate all sessions
		await this.logoutAll(userId);

		return true;
	}

	/**
	 * Generates a session token
	 */
	private generateSessionToken(): string {
		// Generate a random 32-byte token
		const bytes = randomBytes(32);
		return bytes.toString("base64url");
	}

	/**
	 * Creates a session for a user
	 */
	private async createSession(token: string, userId: string): Promise<void> {
		// Hash token to get session ID
		const sessionId = this.hashToken(token);

		// Set expiry date (30 days from now)
		const now = new Date();
		const expiresAt = new Date(
			now.getTime() + this.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
		);

		// Create session with explicit _id
		try {
			await this.storage.insert<SessionDocument>(this.SESSION_COLLECTION, {
				_id: sessionId,
				userId,
				expiresAt,
			});
		} catch (error) {
			console.error("Failed to insert session:", error);
			throw error; // Re-throw to handle in the login method
		}
	}

	/**
	 * Hashes a session token
	 */
	private hashToken(token: string): string {
		return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	}

	/**
	 * Hashes a password
	 */
	private async hashPassword(password: string): Promise<string> {
		// Using @node-rs/argon2 would be better here, but for simplicity we'll use SHA-256
		// In a real implementation, you should use a proper password hashing algorithm like Argon2
		// This is just a placeholder for the example
		return encodeHexLowerCase(sha256(new TextEncoder().encode(password)));
	}

	/**
	 * Verifies a password against a hash
	 */
	private async verifyPassword(
		password: string,
		hash: string,
	): Promise<boolean> {
		// Again, this is just a placeholder for the example
		// In a real implementation, you would use the verify function from @node-rs/argon2
		const hashedInput = encodeHexLowerCase(
			sha256(new TextEncoder().encode(password)),
		);
		return hashedInput === hash;
	}

	/**
	 * Gets a list of all users
	 */
	async getUsers(): Promise<Array<Omit<UserDocument, "passwordHash">>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const users = await this.storage.find<UserDocument>(
			this.USER_COLLECTION,
			{},
		);

		// Remove password hashes before returning
		return users.map(({ passwordHash, ...user }) => user);
	}

	/**
	 * Gets a user by ID
	 */
	async getUserById(
		userId: string,
	): Promise<Omit<UserDocument, "passwordHash"> | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const user = await this.storage.findOne<UserDocument>(
			this.USER_COLLECTION,
			{ _id: userId } as Partial<UserDocument>,
		);

		if (!user) {
			return null;
		}

		// Remove password hash before returning
		const { passwordHash, ...userWithoutPassword } = user;
		return userWithoutPassword;
	}
}