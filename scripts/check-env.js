import { config } from 'dotenv'
import { existsSync } from 'fs'

// Carrega variáveis de ambiente se existir arquivo .env
if (existsSync('.env')) {
  config()
}


// Verifica se todas as variáveis obrigatórias estão definidas
const missingVars = []

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não encontradas:')
  missingVars.forEach(envVar => {
    console.error(`   - ${envVar}`)
  })
  process.exit(1)
}

