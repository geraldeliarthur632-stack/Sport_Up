# SportUp — Aprenda Esportes Jogando

Aplicativo web gamificado e **PWA instalável** (Apple, Android e PC) para aprender **Futsal, Futebol, Vôlei, Basquete e Ping Pong**, com login Firebase, trilhas de aulas, sistema de fichas, gestão de time (titulares e reservas), chat em tempo real e exportação para WhatsApp.

---

## Como hospedar no GitHub Pages (passo a passo)

Este repositório já está 100% configurado para publicar automaticamente no **GitHub Pages** usando o workflow `.github/workflows/deploy.yml`.

### 1. Subir o projeto para o GitHub
1. Crie um repositório no GitHub (por exemplo, `sportup`).
2. Envie todos os arquivos do projeto para a branch `main` (ou `master`).

### 2. Ativar o GitHub Pages (obrigatório antes do primeiro deploy)
1. No seu repositório no GitHub, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions** e salve.
3. Em **Settings → Actions → General → Workflow permissions**, confirme que está marcado **Read and write permissions** (ou mantenha as permissões de `pages: write` e `id-token: write` liberadas nas regras da organização/repositório).
4. Se o repositório for **privado** no plano gratuito do GitHub, altere a visibilidade para **Public** em **Settings → General → Danger Zone** (o GitHub Pages gratuito exige repositório público).
5. Após ativar **Source → GitHub Actions**, execute novamente o workflow na aba **Actions** (ou faça um novo push). O link público do app aparecerá no próprio job `deploy` (ex.: `https://seu-usuario.github.io/sportup/`).

> **Importante:** O workflow detecta automaticamente o nome do repositório e ajusta `VITE_BASE_PATH` para que o logo, as imagens, o `manifest.webmanifest` e o Service Worker do PWA funcionem corretamente em subpastas (`/sportup/`).

---

## Configurar o Firebase para funcionar no domínio do GitHub Pages

Para que o **Login com Google** e o **Login com E-mail/Senha** funcionem no endereço público do GitHub Pages:

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e abra seu projeto (`gen-lang-client-0961211045`).
2. Vá em **Authentication → Settings → Authorized domains**.
3. Clique em **Add domain** e adicione o domínio do seu GitHub Pages:
   - `seu-usuario.github.io` (sem `https://` e sem o nome do repositório).
4. Em **Authentication → Sign-in method**, confirme que **Google** e **E-mail/senha** estão ativados.
5. Em **Storage**, confirme que o Firebase Storage está habilitado caso queira enviar fotos, áudios e vídeos no chat do time.

---

## Instalar o App (PWA) com o logo do SportUp

> **Por que não instala dentro da prévia incorporada?**
> Navegadores (Chrome, Edge, Safari) bloqueiam a instalação de PWAs dentro de prévias incorporadas (`iframe`) ou links privados com bloqueio de login. Ao abrir o link público do **GitHub Pages** diretamente no navegador do celular ou computador, o **manifesto e os ícones PNG ficam públicos** e o SportUp instala com o logo oficial na tela inicial.

- **Android (Chrome / Edge):** Abra o link do GitHub Pages → toque em **Instalar** no banner do app (ou menu `⋮ → Instalar aplicativo`).
- **Apple (iPhone / iPad Safari):** Abra o link no Safari → toque em **Compartilhar → Adicionar à Tela de Início**.
- **Apple (Mac Safari):** Menu **Arquivo → Adicionar ao Dock**.
- **PC (Windows / Linux — Chrome ou Edge):** Clique no ícone **Instalar** na barra de endereços ou no botão **Instalar** dentro do app.

---

## Desenvolvimento local

```bash
npm install
npm run dev
```

Para gerar o build de produção manualmente:

```bash
npm run build
```
