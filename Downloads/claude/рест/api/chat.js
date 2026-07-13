// Serverless-функция демо-бота Número Uno Steakhouse.
// Склеивает базу знаний (меню/стейки/вино + рестораны) в системный промпт и шлёт
// диалог в OpenRouter. Состояние не хранит — историю присылает клиент.
// Ключ OpenRouter берётся из env и на фронт не уходит.

import { readFileSync } from 'node:fs';

// --- База знаний. Читается один раз на холодный старт, дальше из кеша модуля. ---
// Пути литеральные, относительно этого файла — так Vercel их трассирует и бандлит.
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const KB = {
  menu: read('../menu_all.md'),
  steaks: read('../steaks_all.md'),
  wine: read('../wine_all.md'),
  restaurants: JSON.parse(read('../data/restaurants.json')),
};

// Список ресторанов для промпта — id + факты, по которым бот разводит 3 заведения.
function restaurantsBlock(data) {
  return data.restaurants
    .map(
      (r) =>
        `- id: ${r.id} | ${r.name} | ${r.address}${r.area ? ` (${r.area})` : ''} | tel ${r.phone} | ` +
        `обед ${r.hours.lunch}, ужин ${r.hours.dinner} (${r.hours.days})`
    )
    .join('\n');
}

// Календарь на 14 дней вперёд по Валенсии — чтобы бот НЕ считал даты в уме
// (модель в этом ненадёжна), а брал готовое соответствие «день недели → YYYY-MM-DD».
function madridCalendar(days = 14) {
  const parts = (d) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  const wd = (d, loc) =>
    new Intl.DateTimeFormat(loc, { timeZone: 'Europe/Madrid', weekday: 'long' }).format(d);

  // Полдень UTC, чтобы сдвиг таймзоны не перекинул на соседний день.
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);

  const rows = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const tag = i === 0 ? ' (HOY)' : i === 1 ? ' (MAÑANA)' : '';
    rows.push(`${parts(d)} = ${wd(d, 'es-ES')} / ${wd(d, 'en-GB')}${tag}`);
  }
  return { today: parts(base), todayWd: wd(base, 'es-ES'), table: rows.join('\n') };
}

function buildSystemPrompt() {
  const { today, todayWd, table } = madridCalendar();
  const ids = KB.restaurants.restaurants.map((r) => r.id).join(', ');

  return `Eres el/la anfitrión(a) virtual de Número Uno Steakhouse, un grupo de tres asadores en Valencia.
Hablas de forma cercana y natural, como una persona real. NUNCA usas menús de botones tipo "elige 1 o 2".

IDIOMA (regla crítica): el idioma de tu respuesta lo decide SOLO el idioma en que escribe el huésped en su ÚLTIMO mensaje. Si escribe en inglés, responde TODO en inglés; si escribe en español, responde en español. Ignora los nombres propios (Número Uno, Ruzafa, Calle Ciscar, Plaza de la Reina): no cuentan como idioma. Si el mensaje está en otro idioma distinto, responde en inglés. Mantén un idioma por respuesta, sin mezclar.

FECHA DE HOY (Valencia): ${today} (${todayWd}).
CALENDARIO (usa SIEMPRE esta tabla para convertir "este sábado", "el viernes", "mañana" en una fecha exacta; no calcules tú):
${table}
Si el huésped pide una fecha más allá de esta tabla, calcúlala con cuidado a partir de ella.

REGLAS DE CONTENIDO:
- Responde SOLO con la información de abajo (menú, carnes, vinos, horarios, direcciones). No inventes platos, vinos, precios ni horarios.
- Si te preguntan algo que no está en los datos, dilo con honestidad y ofrece ayuda con lo que sí sabes o con la reserva.
- El menú es común a los tres restaurantes; solo cambian dirección, teléfono y horario de cena.

FLUJO DE RESERVA (llévalo tú, con naturalidad, sin saltarte pasos ni pedir todo de golpe):
1. Restaurante — hay tres, ayúdale a elegir por zona/dirección si duda.
2. Fecha.
3. Hora — dentro del horario del restaurante elegido (comida y cena distintos).
4. Número de personas.
5. Nombre de la reserva.
Cuando tengas los CINCO datos, haz un breve resumen y pide confirmación.

AL CONFIRMAR la reserva, añade al FINAL de tu mensaje, en una línea aparte, este bloque EXACTO (no lo traduzcas, no lo comentes):
<<BOOKING>>{"restaurant_id":"<uno de: ${ids}>","date":"YYYY-MM-DD","time":"HH:MM","guests":<número>,"name":"<nombre>"}<<END>>
El sistema lo convierte en un botón que lleva al huésped al widget real de reservas de Ágora con la fecha ya puesta, y recibirá el email de confirmación como siempre. No pegues enlaces tú mismo.

=== RESTAURANTES ===
${restaurantsBlock(KB.restaurants)}
WhatsApp (único para los tres): ${KB.restaurants.whatsapp}

=== ${KB.menu}

=== ${KB.steaks}

=== CARTA DE VINOS ===
${KB.wine}

=== RECORDATORIO FINAL (máxima prioridad) ===
Los datos de arriba están en español, pero eso NO decide tu idioma. Responde ÍNTEGRAMENTE en el idioma del ÚLTIMO mensaje del huésped:
- Si su último mensaje está en inglés → toda tu respuesta en inglés, sin una sola palabra en español (traduce los platos: "Tomahawk", "dry aged 25 days", etc.), salvo nombres propios de restaurante.
- Si está en español → responde en español.
Nunca mezcles los dos idiomas en una misma respuesta.`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

// Парсинг маркера брони из ответа модели: вырезаем его из текста и строим ссылку Ágora.
function extractBooking(text) {
  const m = text.match(/<<BOOKING>>([\s\S]*?)<<END>>/);
  if (!m) return { clean: text, booking: null };
  const clean = text.replace(m[0], '').trim();
  let data;
  try {
    data = JSON.parse(m[1].trim());
  } catch {
    return { clean, booking: null };
  }
  const r = KB.restaurants.restaurants.find((x) => x.id === data.restaurant_id);
  if (!r) return { clean, booking: null };

  let url = r.booking.url;
  if (r.booking.datePrefill && data.date) {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}${KB.restaurants.dateParam}=${encodeURIComponent(data.date)}`;
  }
  return {
    clean,
    booking: {
      url,
      restaurant: r.name,
      address: r.address,
      date: data.date,
      time: data.time,
      guests: data.guests,
      name: data.name,
      datePrefill: r.booking.datePrefill,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY не задан' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const history = Array.isArray(body.messages) ? body.messages : [];
    // Берём только роли user/assistant и последние 20 реплик — защита от раздувания.
    const clean = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (clean.length === 0) {
      res.status(400).json({ error: 'Пустой запрос' });
      return;
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...clean];
    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

    // Запрос в OpenRouter с ретраями: сетевые сбои (fetch failed) и 429/5xx —
    // транзиентные, для демо важно, чтобы первое сообщение гостя не падало.
    let orRes;
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://numerounosteakhouse.com',
            'X-Title': 'Numero Uno Demo Bot',
          },
          body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: 700 }),
        });
        if (orRes.ok) break;
        if (orRes.status === 429 || orRes.status >= 500) {
          lastErr = `HTTP ${orRes.status}`;
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        // 4xx (кроме 429) — не транзиентное, не ретраим.
        break;
      } catch (e) {
        lastErr = String(e.message || e);
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }

    if (!orRes) {
      res.status(502).json({ error: 'Ошибка соединения с моделью', detail: lastErr });
      return;
    }
    if (!orRes.ok) {
      const errText = await orRes.text();
      res.status(502).json({ error: 'Ошибка модели', detail: errText.slice(0, 500) });
      return;
    }

    const data = await orRes.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const { clean: reply, booking } = extractBooking(raw);

    res.status(200).json({ reply, booking });
  } catch (e) {
    res.status(500).json({ error: 'Внутренняя ошибка', detail: String(e.message || e) });
  }
}
