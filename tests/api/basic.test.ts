import { test, expect, describe, beforeAll } from 'vitest'
import axios from 'axios'
import fs from 'node:fs'
import path from 'node:path'

const api = axios.create({
    baseURL: 'http://localhost:4000'
})

let authToken: string

const loadFixture = (name: string) => {
    const fixturePath = path.join(__dirname, 'fixtures', `${name}.json`)
    return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
}

// Compare body, ignoring dynamic fields marked with "*"
const compareBody = (actual: any, expected: any) => {
    for (const key of Object.keys(expected)) {
        if (expected[key] === '*') {
            expect(actual[key]).toBeDefined()
        } else if (typeof expected[key] === 'object') {
            compareBody(actual[key], expected[key])
        } else {
            expect(actual[key]).toEqual(expected[key])
        }
    }
}

describe('API Tests', () => {
    beforeAll(async () => {
        // Login and set auth token before running other tests
        const res = await api.post('/auth/login', {
            username: 'admin',
            password: 'adminpassword',
        })
        expect(res.status).toBe(200)
        expect(res.data).toMatchObject({
            success: true,
            username: 'admin',
            role: 'admin'
        })
        
        expect(res.data.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
        expect(typeof res.data.token).toBe('string')
        expect(res.data.token.length).toBeGreaterThan(0)

        authToken = res.data.token
        api.defaults.headers.common.Authorization = `Bearer ${authToken}`
    })

    test('Health Check works', async () => {
        const res = await api.get('/health')
        expect(res.status).toBe(200)
        expect(res.data.status).toMatch("ok")
    })
    
    test('Create and deleting a item in a collection works', async () => {
        const fixture = loadFixture('create-article-request')
        const expected = loadFixture('create-article-response')
        
        const res = await api.post('/api/collections/articles/documents', fixture)
        
        expect(res.status).toBe(expected.status)
        expect(res.headers['content-type']).toMatch(expected.headers['content-type'])
        
        compareBody(res.data, expected.body)

        // Remove the document
        const deleteRes = await api.delete(`/api/collections/articles/documents/${res.data._id}`)
        expect(deleteRes.status).toBe(200)
        expect(deleteRes.data.success).toBe(true)
    })

    test('Create and deleting a item in a collection works', async () => {
        const fixture = loadFixture('create-article-request')
        const expected = loadFixture('create-article-response')
        
        const res = await api.post('/api/collections/articles/documents', fixture)
        
        expect(res.status).toBe(expected.status)
        expect(res.headers['content-type']).toMatch(expected.headers['content-type'])
        
        compareBody(res.data, expected.body)

        // Remove the document
        const deleteRes = await api.delete(`/api/collections/articles/documents/${res.data._id}`)
        expect(deleteRes.status).toBe(200)
        expect(deleteRes.data.success).toBe(true)
    })

    test('Creating multiple documents and getting a list works', async () => {
        const fixture = loadFixture('create-article-request')
        const expected = loadFixture('create-article-response')
        
        const res = await api.post('/api/collections/articles/documents', fixture)
        
        expect(res.status).toBe(expected.status)
        expect(res.headers['content-type']).toMatch(expected.headers['content-type'])
        
        compareBody(res.data, expected.body)

        const res2 = await api.post('/api/collections/articles/documents', fixture)

        expect(res2.status).toBe(expected.status)
        expect(res2.headers['content-type']).toMatch(expected.headers['content-type'])

        const listRes = await api.get('/api/collections/articles/documents')
        expect(listRes.status).toBe(200)
        expect(listRes.headers['content-type']).toMatch("application/json")
        expect(listRes.data.documents.length).toBe(2);

        // Remove the documents
        const deleteRes = await api.delete(`/api/collections/articles/documents/${res.data._id}`)
        expect(deleteRes.status).toBe(200)
        expect(deleteRes.data.success).toBe(true)

        const deleteRes2 = await api.delete(`/api/collections/articles/documents/${res2.data._id}`)
        expect(deleteRes2.status).toBe(200)
        expect(deleteRes2.data.success).toBe(true)
    })
})

