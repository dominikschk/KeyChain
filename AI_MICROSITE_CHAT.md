# Microsite-Assistent (ChatGPT) – Anleitung

**Beste Wahl für euch:** OpenAI **ChatGPT** (`gpt-4o-mini` oder `gpt-4o`) über die Edge Function.  
Der API-Key kommt **nur** als Supabase-Secret `OPENAI_API_KEY` – **nie** in den Frontend-Code, **nie** nach GitHub, **nie** nach Vercel als `VITE_…`.

---

## Wichtig: Key-Sicherheit

Wenn ein API-Key irgendwo im Chat, Screenshot oder Commit gelandet ist:

1. [platform.openai.com/api-keys](https://platform.openai.com/api-keys) öffnen  
2. Alten Key **löschen / revoken**  
3. **Neuen** Key erstellen  
4. Nur den neuen Key in Supabase Secrets speichern  

---

## Was der Nutzer sieht („Uwe-Modus“)

- Großer Button **„Seite bauen“** im Konfigurator  
- Fortschrittsbalken „Schritt X von 6“  
- Einfache Sprache + **blaue Antippen-Vorschläge**  
- Am Ende: klarer Hinweis auf Vorschau / Microsite-Editor  
- Wenn ChatGPT erreichbar ist → Cloud-KI; sonst automatisch einfacher geführter Modus  

---

## Schritt-für-Schritt (vor dem GitHub-Push)

### 1) Neuen OpenAI-Key anlegen

1. https://platform.openai.com → einloggen  
2. **API keys** → **Create new secret key**  
3. Key kopieren und sicher ablegen (Passwort-Manager)  
4. Alten/geleakten Key sofort löschen  

### 2) Secret nur in Supabase setzen

1. https://supabase.com/dashboard → euer Projekt  
2. **Edge Functions** → Function `microsite-chat` (nach Deploy) → **Secrets**  
   Oder: **Project Settings** → **Edge Functions** → Secrets  

Secrets:

| Name | Wert |
|------|------|
| `OPENAI_API_KEY` | euer neuer Key (`sk-…`) |
| `OPENAI_MODEL` | optional, z. B. `gpt-4o-mini` |

### 3) Edge Function deployen

Im Projektordner (PowerShell):

```bash
npx supabase login
npx supabase link --project-ref sujngjfghqzofqkzzkrw
npx supabase functions deploy microsite-chat --no-verify-jwt
```

### 4) Danach: Code nach GitHub pushen

(Wenn du magst: im Chat „push auf github“ schreiben.)  
Vercel baut die App neu → Button **Seite bauen** ist live.

### 5) Testen

1. Live-Konfigurator öffnen  
2. **Seite bauen**  
3. Fragen beantworten / Vorschläge antippen  
4. Fenster schließen → Tab **Microsite** + Vorschau **Digital**  

---

## Checkliste vor Push

- [ ] Kein `sk-…` Key in irgendeiner Datei im Repo  
- [ ] `.env.local` enthält **keinen** OpenAI-Key (nur Supabase URL/Anon)  
- [ ] Secret nur in Supabase  
- [ ] Function deployed  

---

## Dateien

- UI: `components/MicrositeChat.tsx`  
- Geführte Schritte: `lib/micrositeChatEngine.ts`  
- API-Client: `lib/micrositeChatApi.ts`  
- Edge Function: `supabase/functions/microsite-chat/index.ts`  
