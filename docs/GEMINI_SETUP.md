# Gemini API setup

The chatbot defaults to the local approved knowledge provider. To enable Google Gemini:

1. Sign in to [Google AI Studio](https://aistudio.google.com/apikey).
2. Create or select a project, then create an API key. Use an authorization key when offered, or restrict a standard key to the Gemini API.
3. Copy `.env.example` to `.env` in the repository root.
4. Set these values in `.env`:

   ```dotenv
   CHAT_PROVIDER=gemini
   GEMINI_API_KEY=replace-with-your-real-key
   GEMINI_MODEL=gemini-3.6-flash
   GEMINI_TIMEOUT_MS=8000
   ```

5. Restart with `docker compose up -d --build --wait`.
6. Sign in as a customer, open **Chat**, and ask “How is my premium calculated?”

The key is read only by the backend container. Do not put it in frontend variables, source control, screenshots, or support messages. The free tier has lower quotas and Google states that free-tier content may be used to improve its products. Do not submit real customer, health, financial, credential, or policy data through a free-tier key. Use the local provider or an appropriately reviewed paid/enterprise configuration for sensitive deployment data.

If Gemini is unavailable, times out, exhausts quota, or returns an unsupported answer, the local approved-content provider remains active as a fallback. Application-status questions are resolved locally from the authenticated user's records and are not sent to Gemini.
