import express from 'express'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const app = express()
app.use(express.json())
app.use(express.static('public'))

const db = new Low(new JSONFile('db.json'), { users: {}, transactions: [] })
await db.read()
db.data ||= { users: {}, transactions: [] }

app.post('/api/register', async (req,res)=>{
  const { phone, name } = req.body
  if(db.data.users[phone]) return res.json({error:"Exists"})
  db.data.users[phone] = { name, balance: 0 }
  db.data.transactions.push({type:"register", phone, time:new Date().toISOString()})
  await db.write()
  res.json({ok:true})
})
app.post('/api/deposit', async (req,res)=>{
  const { phone, amount } = req.body
  if(!db.data.users[phone]) return res.json({error:"Not registered"})
  db.data.users[phone].balance += Number(amount)
  db.data.transactions.push({type:"deposit", phone, amount:Number(amount), time:new Date().toISOString()})
  await db.write()
  res.json({ok:true, balance:db.data.users[phone].balance})
})
app.post('/api/send', async (req,res)=>{
  const { from, to, amount } = req.body
  const amt = Number(amount)
  if(!db.data.users[from] ||!db.data.users[to]) return res.json({error:"One user not registered - B rule"})
  if(db.data.users[from].balance < amt) return res.json({error:"Insufficient"})
  db.data.users[from].balance -= amt
  db.data.users[to].balance += amt
  db.data.transactions.push({type:"send", from, to, amount:amt, time:new Date().toISOString()})
  await db.write()
  res.json({ok:true, from_balance:db.data.users[from].balance})
})
app.post('/api/withdraw', async (req,res)=>{
  const { phone, amount } = req.body
  const amt = Number(amount)
  if(!db.data.users[phone]) return res.json({error:"Not found"})
  if(db.data.users[phone].balance < amt) return res.json({error:"Insufficient"})
  db.data.users[phone].balance -= amt
  db.data.transactions.push({type:"withdraw", phone, amount:amt, time:new Date().toISOString()})
  await db.write()
  res.json({ok:true, balance:db.data.users[phone].balance})
})
app.get('/api/balance/:phone', async (req,res)=>{
  await db.read()
  const u = db.data.users[req.params.phone]
  if(!u) return res.json({error:"Not found"})
  res.json({phone:req.params.phone,...u})
})
app.get('/api/history/:phone', async (req,res)=>{
  await db.read()
  const tx = db.data.transactions.filter(t=> t.phone===req.params.phone || t.from===req.params.phone || t.to===req.params.phone)
  res.json(tx.reverse())
})
app.get('/api/users', async (req,res)=>{ await db.read(); res.json(db.data.users)})

app.listen(3000, ()=>console.log("FINAL JPay Running http://localhost:3000"))
