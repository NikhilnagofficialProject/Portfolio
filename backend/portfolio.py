import os
import pickle
from datetime import datetime
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID")
SHEET_ID = os.getenv("SHEET_ID")

# Scopes for Google APIs
SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets"
]

def authenticate():
    """Authenticate with Google API and return creds"""
    creds = None
    if os.path.exists("token.pickle"):
        with open("token.pickle", "rb") as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "client_secret_portfolio.json", SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open("token.pickle", "wb") as token:
            pickle.dump(creds, token)
    return creds

def get_or_create_subfolder(service, parent_id, subfolder_name):
    """Check if subfolder exists in Drive; if not, create it."""
    query = f"name='{subfolder_name}' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    items = results.get("files", [])
    if items:
        return items[0]["id"]
    
    # Create new folder
    file_metadata = {
        "name": subfolder_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id]
    }
    folder = service.files().create(body=file_metadata, fields="id").execute()
    print(f"Created Drive subfolder: {subfolder_name}")
    return folder["id"]

def escape_filename(filename):
    """Escape single quotes for Drive API queries."""
    return filename.replace("'", "\\'")

def upload_to_drive(service, file_path, category):
    """Upload file to a category subfolder. Replace if exists."""
    filename = os.path.basename(file_path)
    safe_name = escape_filename(filename) # Escape special characters

    # Ensure category subfolder exists
    subfolder_id = get_or_create_subfolder(service, DRIVE_FOLDER_ID, category)

    # Search for existing file in subfolder
    query = f"name='{safe_name}' and '{subfolder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    items = results.get("files", [])

    file_metadata = {"name": filename, "parents": [subfolder_id]}
    media = MediaFileUpload(file_path, resumable=True)

    if items:
        file_id = items[0]["id"]
        updated_file = service.files().update(
            fileId=file_id, media_body=media, fields="id, webViewLink"
        ).execute()
        print(f"Replaced file in {category}: {filename}")
        return updated_file["id"], updated_file["webViewLink"], "Replaced", category
    else:
        file = service.files().create(
            body=file_metadata, media_body=media, fields="id, webViewLink"
        ).execute()
        print(f"Uploaded new file in {category}: {filename}")
        return file["id"], file["webViewLink"], "Added", category

def log_to_sheets(service, filename, link, action, category):
    """Append or update Sheets row with file info + timestamp + action + category"""
    sheet = service.spreadsheets().values().get(
        spreadsheetId=SHEET_ID, range="A:E"
    ).execute()
    values = sheet.get("values", [])

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # If sheet is empty, add header row
    if not values:
        header = [["Filename", "Link", "Last Updated", "Action", "Category"]]
        service.spreadsheets().values().append(
            spreadsheetId=SHEET_ID,
            range="A1",
            valueInputOption="RAW",
            body={"values": header}
        ).execute()
        values = header

    # Check if filename already exists
    for i, row in enumerate(values, start=1):
        if row and row[0] == filename:
            update_range = f"A{i}:E{i}"
            body = {"values": [[filename, link, timestamp, action, category]]}
            service.spreadsheets().values().update(
                spreadsheetId=SHEET_ID,
                range=update_range,
                valueInputOption="RAW",
                body=body
            ).execute()
            print(f"♻️ Updated Sheets row for: {filename}")
            return

    # Append new row
    body = {"values": [[filename, link, timestamp, action, category]]}
    service.spreadsheets().values().append(
        spreadsheetId=SHEET_ID,
        range="A1",
        valueInputOption="RAW",
        body=body
    ).execute()
    print(f"Added new Sheets row for: {filename}")

if __name__ == "__main__":
    creds = authenticate()
    drive_service = build("drive", "v3", credentials=creds)
    sheets_service = build("sheets", "v4", credentials=creds)

    # Root folder where uploads are stored locally
    upload_root = "uploads"

    for root, dirs, files in os.walk(upload_root):
        if root == upload_root:
            continue  # skip root, only process subfolders

        category = os.path.basename(root)  # folder name = category
        for filename in files:
            file_path = os.path.join(root, filename)

            # Upload to Drive subfolder
            file_id, link, action, category = upload_to_drive(drive_service, file_path, category)

            # Log to Sheets
            log_to_sheets(sheets_service, filename, link, action, category)