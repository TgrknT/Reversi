# Reversi (Othello) Online

Modern, responsive ve dark mode destekli bir Reversi (Othello) oyunu. Hem tek oyunculu (botlu) hem de çok oyunculu (Firebase tabanlı) oynanabilir. Tüm arayüz ve oyun mantığı tamamen Türkçe ve kullanıcı dostudur.

## Özellikler
- **Modern ve responsive arayüz** (mobil uyumlu, dark mode)
- **Tek oyunculu mod:** Kolay, Orta, Zor bot seçenekleri
- **Çok oyunculu mod:** Gerçek zamanlı, oda kodu ile arkadaşınla oynama (Firebase Realtime Database)
- **Kılavuz noktaları, skor ve sıra göstergesi**
- **Otomatik pass ve oyun sonu kuralları**
- **Oda oluşturma, katılma, kopyalama ve otomatik temizlik**
- **Kullanıcı dostu hata ve bilgilendirme mesajları**

## Kurulum
1. Bu projeyi indir veya klonla:
   ```
   git clone ...
   ```
2. Proje klasörüne `reversi.png` adında bir favicon ekle (isteğe bağlı).
3. Kendi Firebase projenizi kullanmak isterseniz, hem `reversi-firebase.js` hem de `ended.html` dosyalarındaki Firebase config alanlarını kendi bilgilerinizle değiştirin.
4. Bir HTTP sunucusu ile çalıştır (ör. Python):
   ```
   python -m http.server 8000
   ```
5. Tarayıcıda `http://localhost:8000/reversi2/index.html` adresine git.

## Kullanım
- **Tek Oyunculu:** Ana menüden "Tek Oyunculu" seç, zorluk seç ve oyna.
- **Çok Oyunculu:** "Çok Oyunculu" seç, oda oluştur veya oda kodu ile katıl. Oyun bitince veya rakip çıkınca otomatik bilgilendirme ve temizlik yapılır.
- Oda kodunu kopyalayarak arkadaşına gönderebilirsin.

## Teknik Detaylar
- **HTML, CSS, JavaScript** ile yazıldı.
- Oyun mantığı `reversi.js`, çok oyunculu ve Firebase işlemleri `reversi-firebase.js` dosyasında.
- Firebase Realtime Database ile gerçek zamanlı senkronizasyon.
- Oda ve oyuncu yönetimi, otomatik pass, oyun sonu ve temizlik işlemleri tam uyumlu.
- Oyun sonu ve rakip çıkışı için özel `ended.html` sayfası.
- **Kendi Firebase projenizi kullanmak için hem `reversi-firebase.js` hem de `ended.html` dosyalarındaki config alanlarını değiştirmeniz gerekir.**

## Katkı ve Geliştirme
- Her türlü katkı, öneri ve hata bildirimi için PR veya issue açabilirsin.
- Kendi Firebase projenle kullanmak istersen, `reversi-firebase.js` içindeki config'i değiştirmen yeterli.

## Lisans
MIT

---

**İyi oyunlar!** 🎲 