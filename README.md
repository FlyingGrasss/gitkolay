# GitKolay

GitKolay, GitHub'ı teknik bilgi gerektirmeden kullanmak isteyenler için sade bir web arayüzüdür. Depoları görüntüleyin, dosyaları tarayıcıda düzenleyin, yeni dosya ekleyin veya silin ve yeni depo oluşturun.

Uygulama tamamen istemci tarafında çalışır. Token ve istekler tarayıcıdan doğrudan `api.github.com` adresine gider; GitKolay'a ait bir sunucu, veritabanı veya OAuth akışı yoktur.

## Özellikler

- **Token isteğe bağlı:** Token olmadan herkese açık depoları görüntüleyebilirsiniz.
- **Depo listesi:** Kendi depolarınız son güncellenen sırasıyla listelenir; ad ve açıklamada arama yapılır.
- **Herkese açık profiller:** Bir GitHub kullanıcı adı yazarak o kullanıcının herkese açık depolarına göz atabilirsiniz.
- **Yeni depo:** Ad, açıklama ve gizlilik seçimiyle tek adımda depo oluşturma.
- **Dosya gezintisi:** Sürüm (dal) değiştirme, klasörler arasında gezinme ve dosya açma.
- **Dosya düzenleme:** Metin dosyalarını büyük bir alanda düzenleme, commit mesajıyla kaydetme ve oluşan kaydın bağlantısını görme.
- **Dosya oluşturma ve silme:** Yeni dosya ekleme; onay penceresiyle dosya silme.
- **Commit geçmişi:** Dal bazında commit listesi, dosya bazlı geçmiş, commit istatistikleri ve dosya değişiklikleri.
- **Issue'lar:** Açık/kapalı issue listesi, issue detayı, yorumlar, yeni issue, yorum yazma ve issue kapatma/yeniden açma.
- **Dallar:** Dal listesi, dal değiştirme, kaynak daldan yeni dal oluşturma ve onaylı dal silme.
- **Anlaşılır hatalar:** Geçersiz token, istek sınırı (rate limit), bulunamayan içerik ve ağ hataları için Türkçe mesajlar.
- **Sade arayüz:** Yalnızca açık tema, büyük tipografi ve klavye erişilebilirliği.

## Gereksinimler

- Node.js 20 veya üzeri
- pnpm

## Kurulum

```bash
pnpm install
pnpm dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

Diğer komutlar:

```bash
pnpm typecheck   # TypeScript kontrolü
pnpm lint        # ESLint
pnpm build       # Statik üretim (out/ klasörü)
```

## Token oluşturma

1. [GitHub kişisel erişim tokenları](https://github.com/settings/tokens) sayfasını açın.
2. **Generate new token (classic)** seçeneğini kullanın.
3. **repo** kapsamını işaretleyin. Bu kapsam; özel depoları görmek, dosya yazmak ve depo oluşturmak için gereklidir.
4. Oluşan tokenı GitKolay'daki **Bağlan** ekranına yapıştırın.

Doğrudan `repo` kapsamı seçili token oluşturma bağlantısı: [github.com/settings/tokens/new?scopes=repo](https://github.com/settings/tokens/new?scopes=repo&description=GitKolay)

Token yalnızca `sessionStorage` içinde, `gitkolay:token` anahtarıyla saklanır. Sekmeyi kapattığınızda silinir. **Unut** düğmesiyle istediğiniz zaman temizleyebilirsiniz. Token hiçbir sunucuya gönderilmez; yalnızca GitHub API isteklerinin `Authorization` başlığında kullanılır.

## Vercel'de yayınlama

Proje statik dışa aktarım (`output: "export"`) kullanır.

1. Projeyi bir Git deposuna gönderin.
2. [vercel.com/new](https://vercel.com/new) üzerinden depoyu içe aktarın.
3. Framework olarak **Next.js** seçin; build komutu `pnpm build` olarak kalabilir.
4. Deploy edin.

Vercel, statik çıktıyı `out/` klasöründen yayınlar. İsterseniz `pnpm build` sonrasında `out/` klasörünü herhangi bir statik hosting hizmetine de yükleyebilirsiniz. Bazı statik sunucularda `/repo` adresinin `/repo.html` dosyasına yönlendirilmesi gerekebilir; Vercel bu yönlendirmeyi otomatik yapar.

## Bu sürümün sınırları (v1)

- Merge, pull request ve kod arama yok.
- Yazma işlemleri için `repo` kapsamlı bir token gerekir.
- OAuth veya GitHub oturumu yok; token kullanıcı tarafından oluşturulur.
- Token sekmeye özeldir; başka bir sekmede yeniden bağlanmak gerekir.
- Depo ve dal listeleri en fazla 100 sonuç döndürür; commit, issue ve yorum listeleri sayfalanır.
- GitHub Contents API nedeniyle 1 MB'tan büyük dosyalar düzenlenemez; ikili dosyalar salt okunur önizlenir.
- Alt modüller düzenlenemez; dosya adı değiştirme bu sürümde yoktur.
- Özel depolardaki ikili dosyaların doğrudan indirme bağlantıları GitHub oturumu isteyebilir.

## Teknolojiler

- Next.js 15.5 (App Router, statik dışa aktarım)
- React 19
- Tailwind CSS 3.4
- TypeScript (strict)
- GitHub REST API v3 (`2022-11-28`)
- react-hot-toast
