## ⚡ Integração com Power Automate

### Passo 1 — Crie o fluxo no Power Automate
1. Acesse https://make.powerautomate.com
2. Clique em **"Criar" → "Fluxo de nuvem instantâneo"**
3. Selecione o gatilho: **"Quando uma solicitação HTTP é recebida"**

### Passo 2 — Configure o schema JSON do gatilho
Cole o JSON abaixo no campo **"Esquema JSON do corpo da solicitação"**:

```json
{
  "type": "object",
  "properties": {
    "CodSAP":               { "type": "string" },
    "TipoSolicitacao":      { "type": "string" },
    "Cliente":              { "type": "string" },
    "Endereco":             { "type": "string" },
    "Responsavel":          { "type": "string" },
    "LinhaProduto":         { "type": "string" },
    "Volume2024":           { "type": "number" },
    "Media2024":            { "type": "number" },
    "RazaoSocial":          { "type": "string" },
    "CNPJ":                 { "type": "string" },
    "EnderecoComodatario":  { "type": "string" },
    "ContatoNomeEmailTel":  { "type": "string" },
    "DataInicio":           { "type": "string" },
    "DataTermino":          { "type": "string" },
    "LocalAssinatura":      { "type": "string" },
    "Equipamento":          { "type": "string" },
    "Quantidade":           { "type": "number" },
    "ValorEstimado":        { "type": "number" },
    "Observacoes":          { "type": "string" },
    "DataEnvio":            { "type": "string" },
    "Status":               { "type": "string" }
  }
}
```

### Passo 3 — Monte o fluxo de aprovação
Adicione estas ações em sequência:

```
1. [Gatilho] Quando uma solicitação HTTP é recebida
       ↓
2. Criar item → SharePoint (lista "Solicitações de Comodato")
       ↓
3. Iniciar e aguardar uma aprovação
   - Tipo: Aprovar/Rejeitar - Primeiro a responder
   - Título: "Nova solicitação de comodato — [Cliente]"
   - Atribuído a: email-do-aprovador@empresa.com
       ↓
4. Condição: Resultado da aprovação é igual a "Aprovar"
   ├── SIM:
   │     ├── Preencher um documento Word com marcadores (SharePoint)
   │     ├── Criar arquivo → SharePoint (pasta "Contratos Gerados")
   │     ├── Atualizar item → Status = "Aprovado"
   │     └── Enviar email → Solicitante (com link do contrato)
   └── NÃO:
         ├── Atualizar item → Status = "Reprovado"
         └── Enviar email → Solicitante (com justificativa)
```

### Passo 4 — Conecte o app ao fluxo
1. Após salvar o fluxo, copie a **URL do HTTP POST** gerada automaticamente
2. No arquivo `js/app.js`, localize o trecho comentado:

```javascript
// const FLOW_URL = 'https://prod-XX.westus.logic.azure.com/...';
// const response = await fetch(FLOW_URL, {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(payload),
// });
```

3. Descomente e substitua pela URL real:

```javascript
const FLOW_URL = 'https://prod-XX.westus.logic.azure.com/SUA-URL-AQUI';
const response = await fetch(FLOW_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
if (!response.ok) throw new Error('Erro ao chamar o Power Automate');
```

4. Remova também a linha de simulação:
```javascript
// Remova esta linha:
await new Promise(r => setTimeout(r, 1800));
```

---

## 🏷️ Bookmarks no template Word

No arquivo `template_contrato.docx`, insira bookmarks com esses nomes exatos
(**Inserir → Indicador**) nos campos correspondentes:

| Bookmark              | Campo no contrato              |
|-----------------------|-------------------------------|
| `RazaoSocial`         | Razão Social do Comodatário   |
| `CNPJ`                | CNPJ                          |
| `EnderecoComodatario` | Endereço do Comodatário       |
| `ContatoNomeEmailTel` | Nome / E-mail / Telefone      |
| `DataInicio`          | Data de início de vigência    |
| `DataTermino`         | Data de término de vigência   |
| `LocalAssinatura`     | Local de assinatura           |
| `CodSAP`              | Código SAP                    |
| `Cliente`             | Nome do Cliente               |
| `LinhaProduto`        | Linha de Produto              |
| `Equipamento`         | Especificação do Equipamento  |
| `Quantidade`          | Quantidade                    |
| `ValorEstimado`       | Valor Estimado                |

---

## 🔒 CORS — Importante

O Power Automate aceita chamadas HTTP de qualquer origem por padrão.
Se encontrar erro de CORS ao chamar o fluxo, adicione a resposta HTTP
ao final do fluxo no Power Automate com o header:

```
Access-Control-Allow-Origin: *
```

---

## 📞 Suporte

Dúvidas sobre o fluxo no Power Automate:
https://learn.microsoft.com/pt-br/power-automate/

Dúvidas sobre GitHub Pages:
https://docs.github.com/pt/pages
