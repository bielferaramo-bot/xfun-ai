# SiftQ - MiniMax H3 Showcase Clone

Cópia fiel e interativa da landing page do **SiftQ MiniMax H3** (`https://siftq.com/minimax-h3/try`).

## 🚀 Como Executar

Você pode abrir o projeto de duas formas:

### 1. Diretamente no Navegador
Abra o arquivo [`index.html`](index.html) em qualquer navegador moderno (Edge, Chrome, Firefox, Safari).

### 2. Servidor Local
Para melhor performance de streaming de mídia e fontes:
```powershell
node serve.mjs
```
Acesse em: [http://localhost:3000](http://localhost:3000)

---

## ✨ Recursos Implementados

1. **Player Principal MiniMax H3**:
   - Reprodução de vídeo cinematográfico com áudio sincronizado.
   - Pôster e vídeo nativo em alta qualidade.
   - Simulação de renderização com barra de progresso e etapas neurais.

2. **Fluxo de Trabalho Interativo**:
   - **Sweet Resistance**: Título, descrição e prompt cinematográfico completo.
   - **Upload de Imagem**: Altere a imagem de referência selecionando arquivos locais (JPG, PNG, WEBP).
   - **Ações de Prompt**: Botões "Limpar" e "Copiar" (com feedback de Toast).
   - **Seletor de Resolução**: 480P, 768P (Grátis), 1080P e 2K com estado ativo dinâmico.
   - **Slider de Duração**: Ajuste de 4s a 30s com preenchimento em tempo real e atualização de metadados.

3. **Galeria H3 ("Mais criações")**:
   - 8 cards interativos com pré-visualização de vídeo ao passar o mouse.
   - Ao clicar em qualquer card, o projeto principal carrega o vídeo, imagem de referência, título e prompt daquele caso.

4. **Gaveta de Créditos ("Comprar créditos")**:
   - Painel lateral deslizante com saldo de créditos, pacotes (R$ 19,90 e R$ 49,90), benefícios e checkout simulado.

5. **Creator Program**:
   - Balão flutuante informativo com opção de fechar.
   - Botão launcher flutuante neon.
   - Chat interativo completo de suporte a criadores.

6. **Modais e Idiomas**:
   - Modal de Autenticação (Login / Cadastro / Google OAuth).
   - Seletor de Idiomas com suporte a Português, Inglês, Espanhol, Japonês, Chinês, Alemão e Francês.
