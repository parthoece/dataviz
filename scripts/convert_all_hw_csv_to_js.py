import os
import csv
import json

root = "."  # Project root
js_var_name = "irisData"

for folder in os.listdir(root):
    if folder.startswith("312540006_hw") and os.path.isdir(folder):
        for file in os.listdir(folder):
            if file.endswith(".csv"):
                csv_path = os.path.join(folder, file)
                js_path = os.path.join(folder, file.replace(".csv", "_data.js"))

                with open(csv_path, newline='', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    rows = list(reader)

                with open(js_path, "w", encoding='utf-8') as jsfile:
                    jsfile.write(f"const {js_var_name} = ")
                    json.dump(rows, jsfile, indent=2)
                    jsfile.write(";")

                print(f" Converted {csv_path} → {js_path}")
