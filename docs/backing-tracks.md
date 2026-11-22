# YouTube backing tracks

Scales runs on GitHub Pages. When a player chooses **Find backing tracks**, the browser reads its local configuration and calls YouTube Data API v3. One search returns up to three videos that allow embedding and playback outside YouTube. Opening a result starts a YouTube player beside the practice controls. YouTube controls availability and may require a video to be watched on its website. [YouTube search reference](https://developers.google.com/youtube/v3/docs/search/list)

## Local setup

1. Sign in to Google Cloud, select or create a project, and click **Enable** on the [YouTube Data API v3 page](https://console.cloud.google.com/apis/library/youtube.googleapis.com).
2. With the same project selected, choose **Create credentials → API key** on the [Credentials page](https://console.cloud.google.com/apis/credentials). A standard API key lets the finder search public videos. [YouTube authentication guide](https://developers.google.com/youtube/data/guides/authentication)
3. In the key settings, set **Application restrictions** to **Websites**. Add `http://127.0.0.1:4173/*` and `http://localhost:4173/*`. Under **API restrictions**, choose **Restrict key**, select **YouTube Data API v3**, and save. [Google Cloud key restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys)
4. In the project root, open `.env` (copy `.env.example` to `.env` first if needed). Paste your key after the equals sign in `YOUTUBE_API_KEY=` and save the file. An exported environment variable of the same name takes precedence.
5. Run `npm run build` after saving the key. If the local server is already running, refresh the preview. Otherwise start it with `npm run dev`. Choose a scale and click **Find backing tracks** below the fretboard. [Open the local preview](http://127.0.0.1:4173/)

The build publishes this browser key in `dist/youtube-config.json`. Anyone who opens the site can read it, so configure the website and API restrictions before use. The source `.env` stays outside version control. Without a configured key, the finder shows a setup message when someone starts a search.

## GitHub Pages

Create a production website-restricted key for the published origin, such as `https://lucasmkrx.github.io/*`. Add it as a repository **Actions variable** named `YOUTUBE_API_KEY` under **Settings → Secrets and variables → Actions → Variables**. Run the Pages workflow again to publish the new configuration. Monitor the project’s search quota in Google Cloud. [YouTube API quota](https://developers.google.com/youtube/v3/determine_quota_cost)

## What gets searched

The finder combines the root and harmonic context with the selected style, tempo and instrument. A minor pentatonic in Blues searches for an A minor blues backing track. A Dorian in Funk keeps the mode in the query. Custom formulas use a matching named scale when available and a tonic drone otherwise. Bass queries request bassless tracks. Guitar queries request accompaniment for lead guitar, which can include rhythm guitar.

The tempo control adds a descriptive search term. An exact BPM may appear in the original video title. Each explicit search makes one Data API search request, and filters and fretboard edits stay local until then. YouTube serves result thumbnails after searching and the embedded video on playback.
