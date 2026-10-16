import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface NearbyAddress {
  id: string;
  label: string;
  placeName: string;
  lat: number;
  lng: number;
  distanceM: number;
}

function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function demoAddresses(lat: number, lng: number): NearbyAddress[] {
  const offsets = [
    { dLat: 0, dLng: 0, name: "Localização atual", street: "Ponto GPS" },
    { dLat: 0.0008, dLng: 0.0003, name: "Residência próxima", street: "Rua adjacente, 120" },
    { dLat: -0.0006, dLng: 0.0009, name: "Comércio", street: "Av. lateral, 45" },
    { dLat: 0.0011, dLng: -0.0004, name: "Condomínio", street: "Alameda Norte, 88" },
    { dLat: -0.0003, dLng: -0.0007, name: "Escritório", street: "Travessa Sul, 12" },
  ];
  return offsets.map((o, i) => {
    const p = { lat: lat + o.dLat, lng: lng + o.dLng };
    return {
      id: `demo-${i}`,
      label: `${o.street} — próximo ao GPS`,
      placeName: o.name,
      lat: p.lat,
      lng: p.lng,
      distanceM: Math.round(haversineM({ lat, lng }, p)),
    };
  });
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng obrigatórios" }, { status: 400 });
  }

  try {
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const nearbyUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=&addressdetails=1&limit=8&bounded=1&viewbox=${lng - 0.01}%2C${lat + 0.01}%2C${lng + 0.01}%2C${lat - 0.01}`;

    const headers = {
      "User-Agent": "ObraCam/0.1 (demo; contact@obracam.app)",
      Accept: "application/json",
    };

    const [reverseRes, nearbyRes] = await Promise.all([
      fetch(reverseUrl, { headers, next: { revalidate: 0 } }),
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers, next: { revalidate: 0 } }
      ),
    ]);

    const results: NearbyAddress[] = [];

    if (reverseRes.ok) {
      const data = await reverseRes.json();
      if (data?.display_name) {
        results.push({
          id: "current",
          label: data.display_name,
          placeName:
            data.name ||
            data.address?.road ||
            data.address?.building ||
            "Endereço atual",
          lat: Number(data.lat) || lat,
          lng: Number(data.lon) || lng,
          distanceM: 0,
        });
      }
    }

    // Small search around the point for amenity/building hints
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(
      `${lat.toFixed(4)},${lng.toFixed(4)}`
    )}`;
    void nearbyUrl;
    void nearbyRes;
    void searchUrl;

    // Offset micro-queries for nearby roads
    const deltas = [
      [0.0007, 0],
      [-0.0007, 0],
      [0, 0.0007],
      [0, -0.0007],
      [0.0005, 0.0005],
    ];
    for (const [dLat, dLng] of deltas) {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat + dLat}&lon=${lng + dLng}&zoom=18&addressdetails=1`,
        { headers, next: { revalidate: 0 } }
      );
      if (!r.ok) continue;
      const data = await r.json();
      if (!data?.display_name) continue;
      const point = {
        lat: Number(data.lat) || lat + dLat,
        lng: Number(data.lon) || lng + dLng,
      };
      if (results.some((x) => x.label === data.display_name)) continue;
      results.push({
        id: `n-${results.length}`,
        label: data.display_name,
        placeName:
          data.name ||
          data.address?.road ||
          data.address?.building ||
          "Endereço próximo",
        lat: point.lat,
        lng: point.lng,
        distanceM: Math.round(haversineM({ lat, lng }, point)),
      });
      // Be polite to Nominatim
      await new Promise((res) => setTimeout(res, 200));
    }

    if (results.length === 0) {
      return NextResponse.json({ addresses: demoAddresses(lat, lng), source: "demo" });
    }

    results.sort((a, b) => a.distanceM - b.distanceM);
    return NextResponse.json({ addresses: results.slice(0, 8), source: "nominatim" });
  } catch {
    return NextResponse.json({ addresses: demoAddresses(lat, lng), source: "demo" });
  }
}
