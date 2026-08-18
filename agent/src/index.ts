import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
});

app.get('/health', (c) => {
  return c.json({
    status: 200,
    server: "calories agent",
    date: new Date()
  })
});

app.post("/api/v1/agent/chat", async (c) => {
  
});

export default app
