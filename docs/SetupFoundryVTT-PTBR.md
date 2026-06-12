# Configurando o Custom Login com o Foundry VTT 14.361+

## O Problema

A partir do **Foundry VTT 14.361**, todos os arquivos `.html` servidos pela pasta `Data` são forçados a usar `Content-Type: text/plain`. Navegadores e o cliente Electron exibem o conteúdo como código-fonte em vez de renderizar a página.

As telas de boas-vindas do Custom Login são arquivos `.html` localizados dentro da pasta `assets/screens/` do módulo — que fica dentro de `Data/`. Sem a correção, acessar a URL da página de boas-vindas mostra o código HTML bruto em vez da tela de seleção de personagens.

Esta foi uma mudança de segurança intencional da equipe do Foundry para fechar uma brecha de XSS e exfiltração de dados. As notas oficiais de lançamento dizem:

> *"Renderizar HTML client-side servido diretamente nunca foi um fluxo de trabalho intencional, mas certos módulos/sistemas não convencionais podem ser potencialmente afetados por essa mudança."*

---

## A Correção

A pasta `patch-foundry/` dentro deste módulo contém dois scripts que revertem cirurgicamente o bloqueio de HTML no arquivo `dist/server/express.mjs` do Foundry. Eles removem apenas a opção (`setHeaders:Express.#n`) responsável por forçar `text/plain` nos arquivos `.html` servidos pela pasta `Data/`.

Todo o restante do endurecimento de segurança da versão 14.361 permanece intacto.

---

## Aviso de Segurança

Aplicar este patch reabre o vetor de XSS e exfiltração de dados do mesmo domínio que o Foundry fechou intencionalmente. Prossiga apenas se:

- Você confia em **todo** o conteúdo da sua pasta `Data`, e
- Você confia em **todos** os usuários que têm acesso à sua instância do Foundry.

É mais seguro em configurações **locais** ou de **usuário único**.

---

## Como Aplicar o Patch

Os scripts resolvem os caminhos de arquivo relativos à própria localização deles, portanto **precisam ser copiados para a pasta de instalação do Foundry** antes de serem executados — não funcionarão a partir da pasta do módulo.

### Windows — PowerShell

**Requisitos:** PowerShell 5.1+, executado como Administrador.

**Pasta de instalação do Foundry:** a pasta que contém `dist/` (ex.: `C:\FoundryVTT-Node-14.364\`).

```powershell
# 1. Copie o script para a pasta de instalação do Foundry
Copy-Item "C:\caminho\para\Data\modules\custom-login\patch-foundry\patch-html-hosting-for-node.ps1" `
          "C:\FoundryVTT-Node-14.364\"

# 2. Abra o PowerShell como Administrador e execute
cd "C:\FoundryVTT-Node-14.364"
powershell -ExecutionPolicy Bypass -File patch-html-hosting-for-node.ps1
```

### Linux — Bash

**Requisitos:** `python3` (presente por padrão no Ubuntu e na maioria das distribuições).

**Pasta de instalação do Foundry:** a pasta que contém o binário `foundryvtt` e a pasta `resources/`.

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

Ambos os scripts seguem os mesmos passos:

1. Exibem o aviso de segurança oficial do Foundry e explicam o risco.
2. Pedem confirmação — você precisa digitar `yes` para continuar.
3. Leem a versão do Foundry a partir do `package.json`:
   - Abortam se a versão for inferior a 14.364 (incompatível).
   - Alertam e pedem uma segunda confirmação se a versão for superior a 14.364 (os textos do patch podem ter mudado).
4. Criam um backup do arquivo original (extensão `.bak`).
5. Aplicam o patch — removendo `,setHeaders:Express.#n` da chamada do middleware estático da pasta `Data`.
6. Verificam o resultado. Se a verificação falhar, o backup é restaurado automaticamente e nenhuma alteração permanente é feita.

Após o patch ser aplicado com sucesso, reinicie o Foundry VTT para que a mudança entre em vigor.

---

## Após Cada Atualização do Foundry

Este patch modifica um arquivo do núcleo do Foundry. **Toda atualização do Foundry sobrescreve esse arquivo.** Após atualizar o Foundry, execute o script novamente para reaplicar o patch.

---

## Referência Manual do Patch

Se preferir editar o arquivo diretamente, a alteração está em `dist/server/express.mjs` (Linux: `resources/app/dist/server/express.mjs`).

| | String |
|---|---|
| **Localizar** | `express.static(this.paths.data,{redirect:!1,setHeaders:Express.#n})` |
| **Substituir por** | `express.static(this.paths.data,{redirect:!1})` |

O arquivo é minificado em uma única linha — use localizar e substituir com as strings exatas acima.
