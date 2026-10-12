# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uzak mesafe ilişkisi yaşayan bir çift (ilk kullanıcılar: Okta ve kız arkadaşı). Farklı yerlerdeler ve çoğunlukla bilgisayardan (dizüstü/masaüstü) bağlanıyorlar; muhtemelen aynı anda görüntülü ya da sesli konuşma açıkken. İşleri: birlikte vakit geçirmek, aynı ekranda bir şeyler yaparken yan yana hissetmek.

İleride başka çiftler de kullanabilir (arkadaşlarla paylaşım ya da yayımlanabilir bir ürün). Bu şu an hedef değil ama kapıyı kapatmamak gerekiyor.

## Product Purpose

İki kişinin, hesap açmadan ve sunucu kurmadan, tek bir linkle birbirine bağlanıp aynı anda oyun oynayabildiği, çizebildiği, yapboz yapabildiği ve video izleyebildiği özel bir alan. Başarı: ikisi de akşam "hadi İkimiz'e girelim" diyor ve bağlanmak hiç sürtünme yaratmıyor.

## Positioning

Genel oyun sitelerinin aksine sadece iki kişi için: yabancı yok, lobi yok, hesap yok. Bir oda, iki kişi, ortak bir masa. Oyunlar, çizim, yapboz ve video aynı odada, aynı bağlantıyla; sohbet ve kalp gönderme her ekranda yanınızda.

## Operating Context

- Biri "Oda kur" der, davet linkini (WhatsApp vb. üzerinden) gönderir; diğeri linke tıklayınca otomatik bağlanır.
- Ekran paylaşımlı: biri bir aktivite açınca ikisinde de o açılır.
- Oturumlar genelde akşam, uzun süreli; arada sohbet panelinden yazışılır.
- Odayı kuranın cihazı oyun durumunu saklar; kapatıp açınca kaldıkları yerden devam ederler.

## Capabilities and Constraints

- Aktiviteler: Birlikte Çiz (ortak tahta + Çiz & Tahmin Et), Trash (kart), Yapboz (kendi fotoğrafla), Birlikte İzle (YouTube senkron), Tavla (klasik kurallar, mars 2 puan), Dama (Türk daması).
- Bağlantı: WebRTC eşler arası (PeerJS ücretsiz eşleştirme sunucusu). Kendi sunucusu yok; statik dosyalar olarak ücretsiz barındırılır.
- **Ücretsiz kalmalı:** sunucu, abonelik veya ücretli servis gerektiren çözümler kabul edilmez.
- Derleme adımı yok (düz HTML/CSS/JS); geliştirici makinesinde Node/Python kurulu değil.
- Bilinen sınır: bazı mobil ağlarda doğrudan bağlantı kurulamayabilir (TURN sunucusu yok).
- Arayüz şu an Türkçe. Başka diller kesin bir gereksinim değil; ileride başka çiftlere açılırsa açık karar.

## Brand Commitments

Çalışma adı "İkimiz". Kullanıcı tarafından bağlayıcı bir isim, logo veya marka kararı henüz verilmedi.

## Evidence on Hand

Gerçek kullanıcı yorumu, kullanım verisi veya görsel varlık yok. Uydurulmuş referans, kullanıcı sayısı ya da yorum eklenmemeli.

## Product Principles

1. **Bağlanmak sıfır sürtünme olmalı:** tek link, hesap yok, kopunca kendiliğinden yeniden bağlanma.
2. **Birlikte olma hissi oyunların önünde gelir:** karşı tarafın varlığı (çevrimiçi durumu, sırası, hamlesi, kalpleri) her ekranda hissedilmeli.
3. **Bilgisayar ekranı öncelikli, telefonda da çalışır:** asıl kullanım masaüstü; mobil bozulmamalı.
4. **Ücretsiz ve sahipsiz:** iki kişinin verisi kendi cihazlarında kalır, ödeme veya hesap gerektiren hiçbir şey eklenmez.
5. **Büyümeye açık ama ona göre şişirilmemiş:** başka çiftlere açılabilecek şekilde temiz kalmalı, ama bugün iki kişilik özel bir alan.
