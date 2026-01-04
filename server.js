
import express from 'express'
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'

const app = express()
const PORT = process.env.PORT || 3000
app.use(express.static('public'))

app.get('/pair', async (req,res)=>{
  const number = req.query.number
  if(!number) return res.json({error:'number required'})
  const { state } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({ auth: state, printQRInTerminal:false })
  const code = await sock.requestPairingCode(number)
  res.json({ code })
})

app.listen(PORT, ()=>console.log('Pair web running'))
