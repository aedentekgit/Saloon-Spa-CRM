
import sys

file_path = "/Users/aedenteka/Downloads/Projects/Saloon & Spa  CRM  copy 4/frontend/src/pages/Appointments.tsx"
with open(file_path, 'r') as f:
    lines = f.readlines()

# We want to replace lines 467 to 472 (0-indexed: 466 to 471)
# 467:                    {appointments
# 468:                      .filter(apt => 
# 469:                        apt.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
# 470:                        apt.service.toLowerCase().includes(searchTerm.toLowerCase())
# 471:                      )
# 472:                      .map((apt, idx) => (

# Let's find the exact lines by content to be safe
start_idx = -1
for i, line in enumerate(lines):
    if "{appointments" in line and "filter" in lines[i+1]:
        start_idx = i
        break

if start_idx != -1:
    new_lines = lines[:start_idx]
    new_lines.append("                    {filteredAppointments.map((apt, idx) => (\n")
    new_lines.extend(lines[start_idx+6:])
    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    print(f"Successfully replaced starting at line {start_idx + 1}")
else:
    print("Could not find target lines")
