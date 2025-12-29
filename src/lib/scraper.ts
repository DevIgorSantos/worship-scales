export interface ScrapedSongData {
    title: string
    artist: string
    tone: string
    content: string
    youtubeLink?: string
}

export async function fetchCifraClubData(url: string): Promise<ScrapedSongData> {
    // Validate URL
    if (!url.includes('cifraclub.com.br')) {
        throw new Error('URL inválida. Por favor, insira um link do Cifra Club.')
    }

    // Use allorigins as a CORS proxy
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`

    const response = await fetch(proxyUrl)
    if (!response.ok) {
        throw new Error('Falha ao acessar a URL via proxy.')
    }

    const data = await response.json()
    const html = data.contents

    if (!html) {
        throw new Error('Não foi possível obter o conteúdo da página.')
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Extract Title
    const titleElement = doc.querySelector('h1.t1')
    const title = titleElement?.textContent?.trim() || ''

    // Extract Artist
    const artistElement = doc.querySelector('h2.t3')
    const artist = artistElement?.textContent?.trim() || ''

    // Extract Tone (Key)
    // Usually in an element with id "cifra_tom" containing an anchor or span
    const toneElement = doc.querySelector('#cifra_tom a') || doc.querySelector('#cifra_tom')
    let tone = toneElement?.textContent?.trim() || 'C'

    // Normalize Tone (Cifra Club might use "Dozinho" ?? no, usually just chords)
    // Sometimes it gives "Tom: D", we need to strip "Tom: " if present, though selector usually targets the chord itself.

    // Extract Content
    // The content is usually in a <pre> tag inside .cifra_conteudo or just .cifra
    const contentElement = doc.querySelector('pre')
    let content = ''

    if (contentElement) {
        // Preserve whitespace
        content = contentElement.textContent || ''
    } else {
        // Fallback for some layouts
        const container = doc.querySelector('.cifra-conteudo') || doc.querySelector('.cifra_conteudo')
        if (container) {
            content = container.textContent || ''
        }
    }

    // Extract YouTube Link
    let youtubeLink = ''

    // Try to find iframe with youtube src
    const iframe = doc.querySelector('iframe[src*="youtube.com/embed"]')
    if (iframe) {
        const src = iframe.getAttribute('src')
        if (src) {
            // Normalize to watch URL? Or keep embed? Database usually stores watch URL for users to click.
            // src is usually https://www.youtube.com/embed/VIDEO_ID?parameters
            // We want https://www.youtube.com/watch?v=VIDEO_ID
            const match = src.match(/embed\/([^?]+)/)
            if (match && match[1]) {
                youtubeLink = `https://www.youtube.com/watch?v=${match[1]}`
            } else {
                youtubeLink = src
            }
        }
    }

    if (!title && !content) {
        throw new Error('Falha ao extrair dados da música. O layout da página pode ter mudado.')
    }

    return {
        title,
        artist,
        tone,
        content,
        youtubeLink
    }
}
