---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["style.css","js/app.js"]
---

# Surface: İkimiz uygulama kabuğu (giriş, menü, üst çubuk, sohbet, altı aktivite ekranı)

Kapsam: tüm uygulama. Mod: Operate. Kitle ve kısıtlar PRODUCT.md'de. Tahtalar da bu dünyaya uyar. Kaçınılacaklar (kullanıcı): çocuksu/oyuncak, abartılı romantik, kurumsal-soğuk, kumarhane/neon. Kullanıcı ek olarak "daha sade ve modern" istedi.

Yön geçmişi: 1. tur (seed 757c50b0) Uçak Postası seçildi ve inşa edildi; kullanıcı beğenmedi. 2. tur (safer, re-roll 1) gösterildi; kullanıcı onun yerine başka bir projedeki "İznik Çini Salonu" (katalog: architecture-places-azulejo-station-hall, İznik çinisine çevrilmiş) yönünü açıkça istedi. Kullanıcının sabitlediği yön zarın önüne geçer.

## Direction contract

THESIS: İkimiz, iki kişinin birlikte döşediği bir çini pano: her aktivite çift çizgili bir kartuş, her hamle o kartuşun köşesindeki rozeti boyar. Reddettiği varsayılan: renkli oyun kartı ızgarası ve hediyelik eşya gibi her yere serpiştirilmiş çini deseni.

OWN-WORLD: Süt beyazı sır zemin (#F6F4EE) üzerinde çok hafif kobalt derz ızgarası; kobalt #1E4FA0 kabuğu taşır, mercan #C23B2A ve çini yeşili #2E7D6B durum ve ikinci oyuncu için. Çift çizgili kartuş kenarlar (2px dış + 1px iç), 4px köşe. Bordür bandı yalnız üst çubukta, kart sırtlarında ve tahta çerçevelerinde. Başlık Marcellus büyük harf, gövde Figtree. Gece: koyu kobalt sır.

STORY: İki kişi bağlanır, altı panoda canlı durumu okur (sıra, skor, parça), birine girer, oynar; karşı tarafın hamlesi kendi renginde boyanan rozetle görünür.

FIRST VIEWPORT: Üstte süt beyazı tek satır kabuk (İKİMİZ kartuşu, "Okta · Sevgilim" mürekkep renkleriyle, bağlantı, davet/kalp/sohbet), altında ince çini bordür. Solda 3x2 kartuş pano ızgarası (değer rakamı, kobalt fırça ikon, ad, durum, köşe rozeti). Sağda Kimden/Kime kartuşu, oda kodu, davet, son mesajlar. Birincil eylem: panoya tıklamak.

FORM: İznik Çini Salonu (kullanıcının sabitlediği katalog dünyası; listemde yoktu). Seed key 757c50b0 (re-roll 1 safer turu kullanıcı tarafından geçildi). İmza hareketi: rozet boyanması, clip-path daire açılımı + hafif dönüş, hamleyi yapanın renginde.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
