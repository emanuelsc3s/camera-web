import { config } from 'dotenv'
import { existsSync } from 'fs'

// Carrega variáveis de ambiente se existir arquivo .env
if (existsSync('.env')) {
  config()
}

// Lista de variáveis de ambiente opcionais
const optionalEnvVars = [
  'VITE_APP_TITLE',
  'VITE_API_URL'
]

// Verifica se todas as variáveis obrigatórias estão definidas
const missingVars = []

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não encontradas:')
  missingVars.forEach(envVar => {
    console.error(`   - ${envVar}`)
  })
  process.exit(1)
}

console.log('✅ Verificação de ambiente concluída com sucesso!')

// Lista variáveis opcionais configuradas
const configuredOptionalVars = optionalEnvVars.filter(envVar => process.env[envVar])
if (configuredOptionalVars.length > 0) {
  console.log('📋 Variáveis opcionais configuradas:')
  configuredOptionalVars.forEach(envVar => {
    console.log(`   - ${envVar}: ${process.env[envVar]}`)
  })
}