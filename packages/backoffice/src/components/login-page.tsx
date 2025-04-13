import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";

export function LoginPage() {
	const { login, isLoading } = useAuth();

	const form = useForm({
		defaultValues: {
			username: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await login(value.username, value.password);
		},
	});

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
						nullCMS
					</h2>
					<p className="mt-2 text-sm text-gray-600">
						Please sign in to continue to the backoffice
					</p>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<Card>
						<CardContent className="space-y-4 pt-6">
							<form.Field name="username">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor="username">Username</Label>
										<Input
										    data-testid="username"
											id="username"
											type="text"
											placeholder="name@example.com"
											required
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={isLoading}
										/>
									</div>
								)}
							</form.Field>

							<form.Field name="password">
								{(field) => (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<Label htmlFor="password">Password</Label>
										</div>
										<Input
											data-testid="password"
											id="password"
											type="password"
											required
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											disabled={isLoading}
										/>
									</div>
								)}
							</form.Field>
						</CardContent>
						<CardFooter>
							<Button
								data-testid="login-button"
								className="w-full hover:cursor-pointer"
								size="lg"
								type="submit"
								disabled={isLoading}
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Signing in...
									</>
								) : (
									"Sign in"
								)}
							</Button>
						</CardFooter>
					</Card>
				</form>
			</div>
		</div>
	);
}
