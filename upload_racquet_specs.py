import csv
import requests
import os

SUPABASE_URL = "https://inqysjfrwfttngymydnw.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucXlzamZyd2Z0dG5neW15ZG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODcwOTcsImV4cCI6MjA4OTg2MzA5N30.bk0cCpHOwGbwbbaZ9dtCtq4zOKUg1cYrCCVrKNZQDds"

csv_path = "/home/clay/code/Stringers-Friend/complete_tennis_db.csv"

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Loaded {len(rows)} rows from CSV")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal"
}

base_url = f"{SUPABASE_URL}/rest/v1/racquet_specs_cache?on_conflict=brand,model"

errors = []
batch_size = 100

for i in range(0, len(rows), batch_size):
    batch = rows[i:i+batch_size]
    records = []
    
    for row in batch:
        record = {
            "brand": row["Brand"],
            "model": row["Racquet Name"],
            "tension_range": row["Tension"],
            "string_pattern": row["Pattern"],
            "stringing_instructions": f"Length: {row['Length']}, Skip M Holes: {row['Skip M Holes']}, Tie Off M: {row['Tie Off M']}, Start C: {row['Start C']}, Tie Off C: {row['Tie Off C']}"
        }
        records.append(record)
    
    # Deduplicate by brand+model
    seen = set()
    unique_records = []
    for r in records:
        key = (r["brand"], r["model"])
        if key not in seen:
            seen.add(key)
            unique_records.append(r)
    records = unique_records
    
    response = requests.post(base_url, headers=headers, json=records)
    
    if response.status_code >= 400:
        errors.append(f"Batch {i//batch_size + 1}: {response.status_code} - {response.text[:200]}")
    else:
        print(f"Uploaded batch {i//batch_size + 1} ({len(records)} records)")

if errors:
    print(f"\nErrors: {len(errors)}")
    for e in errors:
        print(e)
else:
    print(f"\nDone! Uploaded {len(rows)} records.")