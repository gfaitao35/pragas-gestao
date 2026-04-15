// Armazenamento em memoria para metas (demo apenas)
// No projeto real, usar a tabela metas_lucro do banco de dados
const metasStore = new Map<string, { valor_meta: number; observacoes: string }>()

export { metasStore }
