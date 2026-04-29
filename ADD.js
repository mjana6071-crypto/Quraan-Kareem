// 1. تسجيل الـ Service Worker لضمان عمل الموقع بدون إنترنت
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Error', err));
    });
}

const CACHE_NAME = 'quran-v1';
const surahContainer = document.getElementById('surahContainer');
const mainAudio = document.getElementById('mainAudio');
const nowPlaying = document.getElementById('nowPlaying');
const searchInput = document.getElementById('searchInput');

let allSurahs = []; // لتخزين السور من أجل البحث

// 2. جلب بيانات السور عند تحميل الصفحة
async function fetchSurahs() {
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        allSurahs = data.data;
        displaySurahs(allSurahs);
    } catch (error) {
        surahContainer.innerHTML = "<p style='color:red'>Check The Network</p>";
    }
}

// 3. عرض السور في الصفحة
function displaySurahs(surahs) {
    surahContainer.innerHTML = '';
    surahs.forEach((surah) => {
        // تنسيق الرقم ليكون 3 خانات (مثل 001) لروابط فارس عباد
        const surahNumber = surah.number.toString().padStart(3, '0');
        const audioUrl = `https://server8.mp3quran.net/frs_a/${surahNumber}.mp3`;

        const card = document.createElement('div');
        card.className = 'surah-card';
        card.innerHTML = `
            <div class="surah-info">
                <strong>${surah.number}. ${surah.name}</strong>
            </div>
            
            <div id="progress-container-${surah.number}" class="progress-wrapper" style="display:none; width: 100%; height: 5px; background: #eee; margin: 10px 0;">
                <div id="progress-bar-${surah.number}" style="width: 0%; height: 100%; background: #27ae60;"></div>
            </div>

            <div class="btn-group">
                <button class="play-btn" onclick="playAudio('${audioUrl}', '${surah.name}', ${surah.number})">Play</button>
                <button id="btn-${surah.number}" class="download-btn" onclick="saveForOffline('${audioUrl}', '${surah.name}', ${surah.number})">Save To Offline</button>
            </div>
        `;
        surahContainer.appendChild(card);
    });
}

// 4. وظيفة التشغيل
function playAudio(url, name, id) {
    mainAudio.src = url;
    mainAudio.setAttribute('data-current-id', id);
    mainAudio.play();
    nowPlaying.innerText = "أنت تستمع الآن إلى سورة: " + name;
    nowPlaying.setAttribute('data-id', id);
}

// 5. وظيفة الحفظ للأوفلاين مع شريط تقدم
async function saveForOffline(url, name, id) {
    const btn = document.getElementById(`btn-${id}`);
    const progressContainer = document.getElementById(`progress-container-${id}`);
    const progressBar = document.getElementById(`progress-bar-${id}`);

    btn.disabled = true;
    btn.innerText = "Loding...";
    progressContainer.style.display = 'block';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        
        let receivedLength = 0;
        let chunks = []; 

        while(true) {
            const {done, value} = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            
            // تحديث شريط التقدم
            let step = (receivedLength / contentLength) * 100;
            progressBar.style.width = step + '%';
        }

        // تخزين الملف في الـ Cache بعد اكتمال التحميل
        const blob = new Blob(chunks);
        const cache = await caches.open(CACHE_NAME);
        await cache.put(url, new Response(blob));

        btn.innerText = "Ready To Offline";
        btn.style.backgroundColor = "#27ae60";
        setTimeout(() => { progressContainer.style.display = 'none'; }, 2000);

    } catch (error) {
        console.error(error);
        alert("Sorry Try Again");
        btn.disabled = false;
        btn.innerText = "Save To Offline";
    }
}

// 6. تشغيل السورة التالية تلقائياً
mainAudio.onended = function() {
    let currentId = parseInt(nowPlaying.getAttribute('data-id'));
    let nextId = currentId + 1;
    if (nextId <= 114) {
        // ابحث عن السورة التالية في القائمة وشغلها
        const nextSurah = allSurahs.find(s => s.number === nextId);
        if(nextSurah) {
            const nextUrl = `https://server8.mp3quran.net/frs_a/${nextId.toString().padStart(3, '0')}.mp3`;
            playAudio(nextUrl, nextSurah.name, nextId);
        }
    }
};

// وظيفة لتنظيف النص العربي (إزالة الهمزات وتوحيد التاء المربوطة)
function normalizeArabic(text) {
    if (!text) return "";
    return text
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[\u064B-\u0652]/g, ""); // إزالة التشكيل إذا وجد
}

// 7. البحث المطور والدقيق
searchInput.addEventListener('input', (e) => {
    const term = normalizeArabic(e.target.value.trim().toLowerCase());
    
    const filtered = allSurahs.filter(surah => {
        // تنظيف اسم السورة الأصلي قبل المقارنة
        const cleanSurahName = normalizeArabic(surah.name);
        const cleanEnglishName = surah.englishName.toLowerCase();
        
        return cleanSurahName.includes(term) || cleanEnglishName.includes(term);
    });

    displaySurahs(filtered);
});

// بدء التشغيل
fetchSurahs();