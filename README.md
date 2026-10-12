# İkimiz 💞

İki kişilik oyun ve aktivite uygulaması: **Birlikte Çiz** (+ Çiz & Tahmin Et), **Trash**, **Yapboz**, **Birlikte İzle** (YouTube), **Tavla**, **Dama** (Türk daması), **Kızma Birader**, **UNO** ve Overcooked tarzı birlikte yemek yapma oyunu **Mutfak Telaşı**. Ayrıca sohbet ve ❤️ gönderme.

## Nasıl çalışır?
- Sunucu yok: iki cihaz birbirine doğrudan bağlanır (WebRTC / PeerJS). Bağlantıyı başlatmak için PeerJS'in ücretsiz eşleştirme sunucusu kullanılır.
- Biri adını ve bir oda şifresi yazıp **Oda kur** der, davet linkini diğerine gönderir. Link şifreyi de taşır; açılınca otomatik bağlanırsınız. Kodu bilip şifreyi bilmeyen biri bağlanamaz.
- Oyunların durumu odayı kuranın cihazında saklanır. Uygulamayı kapatıp açınca kaldığınız yerden devam edersiniz.

## Bilgisayarda deneme
```
powershell -ExecutionPolicy Bypass -File serve.ps1
```
Sonra http://localhost:8765 adresini aç. Tek bilgisayarda iki sekmeyle denemek için:
`http://localhost:8765/?local=a` ve `http://localhost:8765/?local=b`

## İnternete koyma (ücretsiz)
Klasör tamamen statik dosyalardan oluşur. GitHub Pages, Cloudflare Pages ya da Netlify'a olduğu gibi yüklenebilir. Telefonda tarayıcının menüsündeki "Ana ekrana ekle" seçeneği uygulama gibi bir kısayol oluşturur.

## Bilinen sınırlar
- Doğrudan bağlantı kurulamazsa (ör. Opera VPN, katı ağlar) uygulama 8 saniye sonra şifreli aktarma moduna geçer (herkese açık MQTT sunucuları üzerinden, oda şifresiyle uçtan uca şifreli).
- YouTube'da ilk açılışta, tarayıcı izin vermediği için ▶️ tuşuna bir kez dokunmak gerekebilir.
- Odayı kuran kişi uygulamayı açık tutmalı; misafir ona bağlanır.
