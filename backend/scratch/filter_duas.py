import json

path = r'c:\Users\wanim\Desktop\deen\backend\data\duas_normalized.json'

# Mappings for known missing data (based on Hisnul Muslim)
UPDATES = {
    166: {"reference": "Muslim 2/616", "grade": "Sahih"},
    167: {"reference": "Muslim 2/616", "grade": "Sahih"},
    168: {"reference": "Muwatta Malik 2/992", "grade": "Sahih"},
    169: {"reference": "Bukhari 1/224, Muslim 1/614", "grade": "Sahih"},
    170: {"reference": "Bukhari 1/224, Muslim 1/614", "grade": "Sahih"},
    171: {"reference": "Abu Dawud 1/305, Sahih Al-Jami 1/408", "grade": "Sahih"},
    172: {"reference": "Bukhari 2/518", "grade": "Sahih"},
    173: {"reference": "Bukhari 1/205, Muslim 1/83", "grade": "Sahih"},
    174: {"reference": "Bukhari 1/224, Muslim 1/614", "grade": "Sahih"},
    175: {"reference": "At-Tirmidhi 5/504, Ad-Darimi 1/336", "grade": "Sahih"},
    233: {"reference": "Bukhari with Muslim", "grade": "Sahih"},
    234: {"reference": "Bukhari 3/462", "grade": "Sahih"},
    235: {"reference": "Abu Dawud 2/179, Ahmad 3/411", "grade": "Sahih"},
    236: {"reference": "Muslim 2/888", "grade": "Sahih"},
    237: {"reference": "At-Tirmidhi 5/572, Malik 1/214", "grade": "Sahih"},
    238: {"reference": "Muslim 2/891", "grade": "Sahih"},
    239: {"reference": "Bukhari 3/581, Muslim 2/946", "grade": "Sahih"},
    221: {"reference": "At-Tirmidhi 5/551", "grade": "Sahih"},
    222: {"reference": "An-Nasa'i, Ibn Hibban", "grade": "Sahih"},
    223: {"reference": "Abu Dawud 2/218, Ahmad 2/367", "grade": "Sahih"},
    228: {"reference": "Bukhari 6/350, Muslim 4/2092", "grade": "Sahih"},
    229: {"reference": "Abu Dawud 4/327, Ahmad 3/306", "grade": "Sahih"}
}

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

new_data = []

for cat in data:
    new_topics = []
    for topic in cat.get('topics', []):
        new_duas = []
        for dua in topic.get('duas', []):
            # Apply updates
            if dua['id'] in UPDATES:
                dua['reference'] = UPDATES[dua['id']]['reference']
                dua['grade'] = UPDATES[dua['id']]['grade']
            
            # Keep only if has both
            if dua.get('reference', '').strip() and dua.get('grade', '').strip():
                new_duas.append(dua)
        
        if new_duas:
            topic['duas'] = new_duas
            topic['dua_count'] = len(new_duas)
            new_topics.append(topic)
    
    if new_topics:
        cat['topics'] = new_topics
        cat['topic_count'] = len(new_topics)
        new_data.append(cat)

with open(path, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, indent=2)

print("Done. Filled known gaps and removed Duas without data.")
