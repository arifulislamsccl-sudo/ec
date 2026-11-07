# Engineering Calculators – Mobile App (PWA)

71টা mechanical, process, maintenance, energy ও project engineering calculator।
Internet ছাড়াও চলে। শুধু হলুদ input ঘর বদলানো যায়।

## ফাইলগুলো
| ফাইল | কাজ |
|---|---|
| index.html | App-এর screen ও design |
| app.js | Navigation, input, result দেখানো |
| engine.js | Excel-এর formula হিসাব করার engine |
| data.js | সব calculator-এর formula ও reference data (Excel থেকে export করা) |
| manifest.webmanifest | App-এর নাম, icon, রং |
| sw.js | Offline-এ চালানোর জন্য |
| icons/ | App icon |
| fonts/ | App-এর font (IBM Plex) – offline-এর জন্য |
| .nojekyll | GitHub Pages-এ `.well-known` folder চালু রাখার জন্য (মুছবেন না) |

## GitHub Pages-এ তোলা
1. github.com-এ account খুলুন → New repository → নাম: `আপনার-username.github.io` → Public।
2. "Add file ▸ Upload files" → এই zip-এর ভেতরের **সব** ফাইল ও `icons` folder টেনে দিন → Commit।
   (`.nojekyll` লুকানো ফাইল; কম্পিউটারে "show hidden files" চালু করে সেটাও upload করুন।)
3. Settings ▸ Pages ▸ Source: Deploy from a branch ▸ Branch: `main`, folder `/ (root)` ▸ Save।
4. ১–২ মিনিট পরে খুলুন: `https://আপনার-username.github.io`

## APK বানানো (PWABuilder)
1. pwabuilder.com → আপনার ঠিকানা দিন → Start → Package for stores ▸ Android ▸ Generate।
2. Package ID যেমন `com.yourname.engcalc`; Signing key: Create new। Zip download করুন, signing key নিরাপদে রাখুন।
3. Zip-এর `assetlinks.json` ফাইলটা repository-তে `.well-known/assetlinks.json` হিসেবে upload করুন (full-screen app-এর জন্য)।
4. `.apk` ফাইল মোবাইলে পাঠিয়ে install করুন।

## Update করা
- Excel-এ কোনো হিসাব বা data বদলালে নতুন `data.js` বানাতে হবে (Claude-কে বললেই বানিয়ে দেবে)।
- নতুন ফাইল GitHub-এ upload করার সময় `sw.js`-এর প্রথম লাইনের `engcalc-v8` বদলে `engcalc-v9` করে দিন, যাতে সবার মোবাইলে নতুন version আসে।
- App একবার খুললে পেছনে update নামে, পরেরবার খুললে নতুন version দেখায়।

## সতর্কতা
ফলাফল preliminary design, screening ও maintenance সিদ্ধান্তের জন্য। Pressure equipment, lifting gear ও relief system চূড়ান্ত করার আগে প্রযোজ্য code ও qualified engineer দিয়ে যাচাই করুন।
