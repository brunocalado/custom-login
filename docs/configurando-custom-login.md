# Configurando o Custom Login no Foundry VTT

## O Problema

A partir do **Foundry VTT 14.364**, todos os arquivos `.html` servidos pela pasta `Data` são forçados a `Content-Type: text/plain`. Navegadores e o cliente Electron exibem o código-fonte bruto em vez de renderizar a página.

As telas de boas-vindas do Custom Login são arquivos `.html` dentro da pasta `assets/screens/` do módulo — que fica dentro de `Data/`. Sem o patch, acessar a URL da página de boas-vindas mostra o código HTML em vez da tela de seleção de personagem.

Essa foi uma mudança de segurança intencional da equipe do Foundry para fechar uma brecha de XSS/exfiltração de dados. As notas de versão oficiais dizem:

> *"Renderizar HTML estático diretamente no cliente nunca foi um fluxo de trabalho planejado, mas certos módulos/sistemas não convencionais podem ser afetados por essa mudança."*

---

## A Solução

A pasta `patch-foundry/` dentro deste módulo contém três scripts que revertem cirurgicamente o bloqueio de HTML no arquivo `express.mjs` do Foundry.

| Script | Plataforma |
|---|---|
| `patch-html-hosting-for-node.ps1` | Windows — versão Node.js do Foundry |
| `patch-html-hosting-for-windows.ps1` | Windows — versão instalada (Electron) |
| `patch-html-hosting-for-linux.sh` | Linux |

Todo o restante do endurecimento de segurança do Foundry 14.364 é preservado.

---

## Aviso de Segurança

Aplicar este patch reabre a brecha de XSS e exfiltração de dados que o Foundry fechou intencionalmente. Prossiga somente se:

- Você confia em **todo** o conteúdo da sua pasta `Data`, e
- Você confia em **todos** os usuários com acesso à sua instância do Foundry.

É mais seguro em instalações **locais** ou de **usuário único**.

---

## Como Aplicar o Patch

Os scripts resolvem os caminhos de arquivo relativos à sua própria localização, então eles **precisam ser copiados para a pasta de instalação do Foundry** antes de serem executados — não funcionam a partir da pasta do módulo.

### Windows — versão Node.js

**Requisitos:** PowerShell 5.1+, executado como Administrador.

**Pasta de instalação do Foundry:** a pasta que contém `dist\` na raiz (ex.: `C:\FoundryVTT-Node-14.364\`).

```powershell
# 1. Copie o script para a pasta de instalação do Foundry
Copy-Item "C:\caminho\para\Data\modules\custom-login\patch-foundry\patch-html-hosting-for-node.ps1" `
          "C:\FoundryVTT-Node-14.364\"

# 2. Abra o PowerShell como Administrador e execute
cd "C:\FoundryVTT-Node-14.364"
powershell -ExecutionPolicy Bypass -File patch-html-hosting-for-node.ps1
```

### Windows — versão instalada (Electron)

**Requisitos:** PowerShell 5.1+.

**Pasta de instalação do Foundry:** a pasta que contém `resources\` (ex.: `C:\Users\SeuNome\AppData\Local\Programs\Foundry Virtual Tabletop\`).

```powershell
# 1. Copie o script para a pasta de instalação do Foundry
Copy-Item "C:\caminho\para\Data\modules\custom-login\patch-foundry\patch-html-hosting-for-windows.ps1" `
          "C:\Users\SeuNome\AppData\Local\Programs\Foundry Virtual Tabletop\"

# 2. Abra o PowerShell e execute
cd "C:\Users\SeuNome\AppData\Local\Programs\Foundry Virtual Tabletop"
powershell -ExecutionPolicy Bypass -File patch-html-hosting-for-windows.ps1
```

### Linux

**Requisitos:** `python3` (disponível por padrão no Ubuntu e na maioria das distros).

**Pasta de instalação do Foundry:** a pasta que contém o binário `foundryvtt` e o diretório `resources/`.

```bash
# 1. Copie o script para a pasta de instalação do Foundry
cp /caminho/para/Data/modules/custom-login/patch-foundry/patch-html-hosting-for-linux.sh \
   /opt/foundry/

# 2. Execute
cd /opt/foundry
bash patch-html-hosting-for-linux.sh
```

---

## O Que os Scripts Fazem

Todos os scripts seguem o mesmo fluxo:

0. **Verificam se o patch já foi aplicado.** Se sim, o script informa isso imediatamente (antes do aviso de segurança) e oferece duas opções:
   - **cancel** — sair sem fazer alterações (padrão; pressione Enter ou digite qualquer coisa que não seja `restore`)
   - **restore** — copiar o backup `.bak` sobre o `express.mjs` e sair
   Se o arquivo de backup não existir, o script avisa que a restauração automática não é possível.
1. Exibem o aviso de segurança oficial do Foundry e explicam o risco.
2. Pedem confirmação — você deve digitar `yes` para continuar.
3. Leem a versão do Foundry a partir do `package.json`:
   - Abortam se a versão for inferior a 14.364 (incompatível).
   - Avisam e pedem uma segunda confirmação se a versão for superior a 14.364 (as strings-alvo podem ter mudado).
4. Criam um backup do arquivo original (extensão `.bak`).
5. Aplicam o(s) patch(es) no `express.mjs`:
   - **Node e Linux:** removem o callback `setHeaders:Express.#n` do middleware estático da pasta `Data`.
   - **Windows instalado (Electron):** aplicam dois patches — removem o callback `setHeaders` E neutralizam o corpo do método `#n`. Ambos são necessários devido à forma como o build Electron carrega o módulo.
6. Verificam o resultado. Se a verificação falhar, o backup é restaurado automaticamente e nenhuma alteração permanente é feita.

Após o patch bem-sucedido, reinicie o Foundry VTT para que a mudança entre em vigor.

---

## Após Cada Atualização do Foundry

Este patch modifica um arquivo central do Foundry. **Toda atualização do Foundry o sobrescreve.** Após atualizar o Foundry, execute o script novamente para reaplicar o patch.

---

## Referência para Patch Manual

Se preferir editar o arquivo diretamente:

| Versão | Arquivo a editar |
|---|---|
| Windows Node | `dist\server\express.mjs` (na raiz da instalação Node) |
| Windows instalado | `resources\app\dist\server\express.mjs` |
| Linux | `resources/app/dist/server/express.mjs` |

O arquivo é minificado em uma única linha — use localizar-e-substituir com as strings exatas abaixo.

**Patch 1 — todas as versões:**

| | String |
|---|---|
| **Localizar** | `express.static(this.paths.data,{redirect:!1,setHeaders:Express.#n})` |
| **Substituir por** | `express.static(this.paths.data,{redirect:!1})` |

**Patch 2 — somente Windows instalado (Electron):**

Localizar:
```
static#n(e,s){const t=mime.lookup(s.replace(/[\s.]+$/,""));"text/html"!==t&&"application/xhtml+xml"!==t||(logger.debug(`Serving ${s} with a Content-Type of "text/plain"`),e.contentType("text/plain"))}
```

Substituir por:
```
static#n(e,s){}
```
