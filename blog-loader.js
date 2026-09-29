/**
 * blog-loader.js
 * Fetches blog posts from a Google Sheet published as CSV, or uses local posts fallback.
 */

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTE19.../pub?output=csv'; 

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const posts = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = [];
        let inQuote = false;
        let currentValue = '';
        
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            
            if (char === '"') {
                if (inQuote && line[charIndex + 1] === '"') {
                    currentValue += '"';
                    charIndex++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue);

        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                let val = values[index] ? values[index].trim() : '';
                row[header] = val;
            });
            posts.push(row);
        }
    }
    return posts;
}

const LOCAL_POSTS = [
    {
        id: 'start-dates-2025',
        title: 'Salesforce Starttermine 2025',
        date: '02.10.2025',
        excerpt: 'Wichtige Termine und Updates für das kommende Jahr. Plane deine Salesforce-Releases frühzeitig.',
        content: '<p>Das neue Jahr bringt spannende Neuerungen im Salesforce-Ökosystem. Damit du deine Projekte und Updates optimal planen kannst, haben wir die wichtigsten Termine für 2025 zusammengefasst.</p><h2>Spring \'25 Release</h2><p>Der Rollout für das Spring \'25 Release beginnt im Januar. Die Sandbox-Preview-Phase startet voraussichtlich am <strong>4. Januar 2025</strong>. Nutzen Sie diese Zeit, um neue Features in Ihrer Sandbox zu testen, bevor sie in die Produktionsumgebung gelangen.</p><p>Wichtige Neuerungen erwarten wir im Bereich <strong>Einstein GPT</strong> und <strong>Flow-Automatisierung</strong>.</p><h2>Summer \'25 Release</h2><p>Das Summer \'25 Release wird voraussichtlich im <strong>Mai 2025</strong> in die Produktion gehen. Achten Sie auf die Preview-Fenster im April.</p><h2>Winter \'26 Release</h2><p>Gegen Ende des Jahres, im <strong>September/Oktober 2025</strong>, folgt das Winter \'26 Release.</p><h2>Dreamforce 2025</h2><p>Die größte Salesforce-Konferenz des Jahres findet voraussichtlich wieder im <strong>September 2025</strong> in San Francisco statt. Merken Sie sich den Termin vor!</p><p><em>Hinweis: Alle Termine sind vorläufig und können sich seitens Salesforce noch ändern.</em>'
    },
    {
        id: 'service-cloud-quick-wins',
        title: '3 einfache Quick Wins für deine Service Cloud',
        date: '02.06.2026',
        excerpt: 'Kleine Stellschrauben mit großer Wirkung. Erfahre, wie du mit minimalem Aufwand die Produktivität deines Support-Teams spürbar steigerst.',
        content: '<p>Oft sind es die kleinen Dinge, die im Support-Alltag den größten Unterschied machen. Hier sind drei einfache Quick Wins für die Salesforce Service Cloud, die du in wenigen Minuten konfigurieren kannst.</p><h2>1. Quick Text für wiederkehrende Antworten</h2><p>Jeder Service-Mitarbeiter tippt täglich dieselben Sätze: Begrüßungen, Erklärungen zum Passwort-Reset oder Verabschiedungen. Mit Quick Text können Teams vordefinierte Textbausteine mit einem Klick oder Tastaturkürzel (z. B. <code>;;bye</code>) in E-Mails, Chats oder Social-Media-Antworten einfügen.</p><h2>2. Makros für repetitive Workflows</h2><p>Ein typischer Ablauf: Ein Kunde sendet eine Bestätigung, der Agent muss den Case schließen, den Status anpassen, eine E-Mail senden und eine Aufgabe erstellen. Mit Salesforce Makros lässt sich diese Klick-Kette automatisieren. Der Agent klickt auf "Makro ausführen" und Salesforce erledigt alle Schritte im Hintergrund.</p><h2>3. Relevante Listenansichten optimieren</h2><p>Verlorene Zeit durch Suchen? Pinne die wichtigsten Listenansichten für dein Team, z.B. "Meine offenen Cases" oder "Dringende Eskalationen". Stelle sicher, dass nur die relevantesten Spalten angezeigt werden und nutze bedingte Formatierungen, um kritische Fristen farblich hervorzuheben.</p>'
    },
    {
        id: 'flows-vs-process-builder',
        title: 'Warum gute Flows den Process Builder ersetzen müssen',
        date: '28.05.2026',
        excerpt: 'Salesforce hat den Process Builder in Rente geschickt. Wir zeigen dir die entscheidenden Vorteile von Salesforce Flow und wie die Migration gelingt.',
        content: '<p>Die Ära des Process Builders und der Workflow-Regeln ist offiziell vorbei. Salesforce setzt vollständig auf Salesforce Flow. Aber das ist kein Grund zur Sorge – im Gegenteil!</p><h2>1. Performance auf einem neuen Level</h2><p>Flows laufen im Vergleich zum Process Builder dramatisch schneller. Das bedeutet kürzere Ladezeiten für deine Nutzer und weniger Gefahr, an die Salesforce-Gouverneursgrenzen (Governor Limits) zu stoßen.</p><h2>2. Robuste Fehlerbehandlung</h2><p>Wenn ein Process Builder fehlschlägt, stürzt der gesamte Prozess ab und der Nutzer sieht eine unschöne Fehlermeldung. Flows bieten sogenannte <em>Fault Paths</em>. Tritt ein Fehler auf, kann der Flow diesen abfangen, eine E-Mail an den Administrator senden und dem Nutzer eine verständliche Hilfemeldung anzeigen.</p><h2>3. Ein Tool für alles</h2><p>Egal ob Hintergrund-Automatisierung (Record-Triggered Flow), interaktive Assistenten (Screen Flow) oder zeitgesteuerte Aktionen (Scheduled Flow) – du benötigst nur noch ein einziges Tool. Das macht die Wartung und Weiterentwicklung deiner Salesforce-Instanz wesentlich einfacher.</p>'
    },
    {
        id: 'salesforce-dashboards-transparency',
        title: 'Mehr Transparenz im Service durch Salesforce Dashboards',
        date: '15.05.2026',
        excerpt: 'Welche KPIs sollte dein Service-Team wirklich im Blick behalten? Ein Leitfaden für effektive Berichte und Dashboards.',
        content: '<p>Ein Service-Team ohne klare Zahlen fliegt im Blindflug. Salesforce Dashboards bieten die perfekte Möglichkeit, die Leistung in Echtzeit zu visualisieren. Diese drei KPIs sollten in keinem Dashboard fehlen:</p><h2>1. First Contact Resolution Rate (FCR)</h2><p>Wie viele Cases werden direkt beim ersten Kundenkontakt gelöst? Eine hohe FCR ist das sicherste Zeichen für effiziente Prozesse und zufriedene Kunden. Du kannst dies messen, indem du Cases auswertest, die mit nur einer Interaktion geschlossen wurden.</p><h2>2. Average Handling Time (AHT)</h2><p>Wie lange benötigt ein Agent durchschnittlich für die Bearbeitung eines Anliegens? Wichtig: AHT sollte nicht als Druckmittel genutzt werden, sondern um Engpässe zu identifizieren (z.B. fehlende Knowledge-Artikel zu komplexen Themen).</p><h2>3. Kundenzufriedenheit (CSAT)</h2><p>Integriere Umfragen direkt nach der Schließung eines Cases in Salesforce. Die Ergebnisse fließen sofort in dein Dashboard ein, sodass du die Kundenzufriedenheit live im Blick behältst und bei negativem Feedback sofort reagieren kannst.</p>'
    }
];

async function fetchBlogPosts() {
    try {
        if (GOOGLE_SHEET_CSV_URL.includes('...') || GOOGLE_SHEET_CSV_URL.includes('YOUR_GOOGLE_SHEET_CSV_URL_HERE') || window.location.search.includes('demo=true')) {
            return LOCAL_POSTS;
        }
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        const parsed = parseCSV(text);
        return parsed.length > 0 ? parsed : LOCAL_POSTS;
    } catch (error) {
        console.warn('Failed to fetch from Google Sheet, using local posts:', error);
        return LOCAL_POSTS;
    }
}

// Global modal opener for blog posts
function openBlogModal(post) {
    let modal = document.getElementById('blog-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'blog-modal';
        modal.className = 'blog-modal-overlay';
        modal.innerHTML = `
            <div class="blog-modal-container">
                <button type="button" class="blog-modal-close" aria-label="Schließen">&times;</button>
                <div class="blog-modal-date" id="modal-date"></div>
                <h2 class="blog-modal-title" id="modal-title"></h2>
                <div class="blog-modal-body" id="modal-content"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.blog-modal-close');
        closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
    }

    document.getElementById('modal-date').textContent = post.date;
    document.getElementById('modal-title').textContent = post.title;
    document.getElementById('modal-content').innerHTML = post.content || `<p>${post.excerpt}</p>`;
    modal.classList.add('active');
}

/**
 * Renders the blog list into the given container.
 */
async function loadBlogList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">Lade Blog-Beiträge...</p>';

    const posts = await fetchBlogPosts();
    container.innerHTML = '';

    if (!posts || posts.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">Keine Beiträge gefunden.</p>';
        return;
    }

    posts.forEach(post => {
        const article = document.createElement('article');
        // Add is-visible immediately so cards are displayed cleanly
        article.className = 'blog-card animate-on-scroll is-visible';
        article.style.cursor = 'pointer';

        article.innerHTML = `
            <div class="blog-date">${post.date}</div>
            <h3>${post.title}</h3>
            <p>${post.excerpt}</p>
            <div class="read-more">Weiterlesen ↗</div>
        `;

        article.onclick = (e) => {
            e.preventDefault();
            openBlogModal(post);
        };

        container.appendChild(article);
    });
}

/**
 * Renders a single blog post on detail pages.
 */
async function loadBlogPost(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');

    const posts = await fetchBlogPosts();
    const post = posts.find(p => p.id === postId) || posts[0];

    if (!post) {
        container.innerHTML = '<p>Beitrag nicht gefunden.</p>';
        return;
    }

    document.title = `${post.title} | Flowlogic Blog`;

    const dateElem = document.getElementById('post-date');
    const titleElem = document.getElementById('post-title');
    const contentElem = document.getElementById('post-content');

    if (dateElem) dateElem.textContent = post.date;
    if (titleElem) titleElem.textContent = post.title;
    if (contentElem) contentElem.innerHTML = post.content;
}
