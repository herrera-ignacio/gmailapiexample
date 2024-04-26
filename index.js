import fs from "fs/promises"
import path from "path"
import process from "process"
import { authenticate } from "@google-cloud/local-auth"
import { google } from "googleapis"
import { Base64 } from "js-base64";

const SCOPES = [
    "https://www.googleapis.com/auth/gmail.send", // send email
    "https://www.googleapis.com/auth/gmail.readonly" // list labels
]
const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json')

/**
 * Reads previously authorized credentials from the save file
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH)
        const credentials = JSON.parse(content.toString())
        return google.auth.fromJSON(credentials)
    } catch (err) {
        return null
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH)
    const keys = JSON.parse(content.toString())
    const key = keys.installed || keys.web
    const payload = JSON.stringify({
        type: "authorized_user",
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token
    })
    await fs.writeFile(TOKEN_PATH, payload)
}

/**
 * Load or request authorization to call APIs
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist()
    if (client) return client

    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH
    })

    if (client.credentials) {
        await saveCredentials(client)
    }

    return client
}

/**
 * List labels in the user's account
 */
async function listLabels(auth) {
    const gmail = google.gmail({ version: "v1", auth })
    const res = await gmail.users.labels.list({
        userId: "me"
    })
    const labels = res.data.labels;

    if (!labels || labels.length === 0) {
        console.log("No labels found");
    } else {
        console.log("Labels:");
        labels.forEach(label => console.log(`- ${label.name}`))
    }
}

const email = createEmail(
    "info@pactocollective.com",
    "ignacioromanherrera@gmail.com, nachodc1995@gmail.com, nickteperman@gmail.com, talbano@itba.edu.ar",
    "Test from Gmail API",
    "Nacho escribiendo con la API de Gmail ;)"
)

// const email = "From: info@pactocollective.com\nTo: ignacioromanherrera@gmail.com\nSubject: Saying Hello\nDate: Thu, 8 Oct 2020 09:55:06 -0600\nMessage-ID: <1234@local.machine.example>\n\nThis is a message just to say hello.\nSo, \"Hello\"."

function createEmail(sender, receiver, subject, message) {
    const emailLines = [];
    emailLines.push(`From: ${sender}`);
    emailLines.push(`To: ${receiver}`);
    emailLines.push(`Subject: ${subject}`);
    emailLines.push('');
    emailLines.push(message); // Message body

   return emailLines.join('\n');
}

// const encodedEmail = Buffer.from(JSON.stringify(email)).toString("base64")
const encodedEmail = Buffer.from(email).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_')
const message = { raw: encodedEmail }

async function sendEmail(auth){
    const gmail = google.gmail({ version: "v1", auth })
    const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: message
    }, { retry: false })
    console.log(res)
}



authorize()
    .then(sendEmail)
    .catch(console.error)
