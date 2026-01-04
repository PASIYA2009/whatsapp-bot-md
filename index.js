
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import Pino from 'pino'
import fs from 'fs'
import fetch from 'node-fetch'
import './server.js'

const cfg = JSON.parse(fs.readFileSync('./config.json'))
const LOGO = `🤖 ${cfg.botName}`
const FOOTER = `\n\n━━━━━━━━━━━━━━━\n${cfg.footer}`

async function aiReply(prompt){
  if(!cfg.openaiApiKey || cfg.openaiApiKey.includes('PUT_')){
    return '⚠️ Set OpenAI API key in config.json'
  }
  const r = await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{
      'Authorization':`Bearer ${cfg.openaiApiKey}`,
      'Content-Type':'application/json'
    },
    body: JSON.stringify({
      model:'gpt-4o-mini',
      messages:[{role:'user',content:prompt}]
    })
  })
  const j = await r.json()
  return j.choices?.[0]?.message?.content || 'AI error'
}

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({ auth: state, logger: Pino({ level:'silent' }) })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if(!m?.message || m.key.fromMe) return
    const jid = m.key.remoteJid
    const text = m.message.conversation || m.message.extendedTextMessage?.text
    if(!text) return

    const send = async (t)=> sock.sendMessage(jid,{text:`${LOGO}\n\n${t}${FOOTER}`})

    if(text === '.menu'){
      await sock.sendMessage(jid,{
        text:`🤖 ${cfg.botName}\n\nChoose:`,
        footer: cfg.footer,
        buttons:[
          {buttonId:'.ai', buttonText:{displayText:'🤖 AI'}, type:1},
          {buttonId:'.settings', buttonText:{displayText:'⚙️ Settings'}, type:1},
          {buttonId:'.pair', buttonText:{displayText:'🔗 Pair'}, type:1}
        ],
        headerType:1
      })
    } else if(text === '.ping') send('🏓 Online')
    else if(text === '.jid') send(jid)
    else if(text.startsWith('.ai')){
      const q = text.replace('.ai','').trim()
      if(!q) return send('Usage: .ai <question>')
      send('🤖 Thinking...')
      const a = await aiReply(q)
      send(a)
    } else if(text === '.settings'){
      send(`Mode: ${cfg.mode}`)
    } else if(text.startsWith('.setmode')){
      const m2 = text.split(' ')[1]
      if(!['public','private'].includes(m2)) return send('Use: .setmode public|private')
      cfg.mode = m2
      fs.writeFileSync('./config.json', JSON.stringify(cfg,null,2))
      send(`Mode set to ${m2}`)
    } else if(text === '.pair'){
      send('🔗 Open pair site: https://YOUR-RENDER-URL.onrender.com')
    }
  })
}
start()
