import { gunBrokerApiUrl, gunBrokerDevKey, gunBrokerUserAgent } from "@/lib/gunbroker/config";
import {
  asCount,
  asList,
  asString,
  GunBrokerApiError,
  pickField,
  type GunBrokerAccount,
} from "@/lib/gunbroker/types";

type RequestOptions = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  accessToken?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function headers(accessToken?: string, contentType: string | false = "application/json") {
  const devKey = gunBrokerDevKey();
  if (!devKey) {
    throw new GunBrokerApiError(500, "GunBroker DevKey is not configured.");
  }

  const next: Record<string, string> = {
    Accept: "application/json",
    "X-DevKey": devKey,
    "User-Agent": gunBrokerUserAgent(),
  };
  if (contentType) {
    next["Content-Type"] = contentType;
  }
  if (accessToken) {
    next["X-AccessToken"] = accessToken;
  }
  return next;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function errorFrom(status: number, payload: unknown) {
  const userMessage =
    asString(pickField(payload, "userMessage", "UserMessage", "message", "Message")) ??
    `GunBroker request failed (${status}).`;
  const developerMessage = asString(
    pickField(payload, "developerMessage", "DeveloperMessage"),
  );
  return new GunBrokerApiError(status, userMessage, developerMessage);
}

export async function gunBrokerRequest<T = unknown>({
  path,
  method = "GET",
  accessToken,
  body,
  query,
}: RequestOptions) {
  const url = new URL(
    `${gunBrokerApiUrl()}${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: headers(accessToken),
      body: body == null ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new GunBrokerApiError(504, "GunBroker took too long to respond.");
    }
    throw error;
  }
  const payload = await parseJson(response);
  if (!response.ok) {
    throw errorFrom(response.status, payload);
  }
  return payload as T;
}

export async function pingGunBroker() {
  try {
    await gunBrokerRequest({ path: "/GunBrokerTime" });
    return { ok: true as const };
  } catch (error) {
    const message =
      error instanceof GunBrokerApiError
        ? error.userMessage
        : "Could not reach the GunBroker API.";
    return { ok: false as const, error: message };
  }
}

export async function createAccessToken(username: string, password: string) {
  const payload = await gunBrokerRequest({
    path: "/Users/AccessToken",
    method: "POST",
    body: {
      Username: username,
      Password: password,
    },
  });
  const token = asString(pickField(payload, "accessToken", "AccessToken"));
  if (!token) {
    throw new GunBrokerApiError(502, "GunBroker did not return an access token.");
  }
  return token;
}

export async function deleteAccessToken(accessToken: string) {
  try {
    await gunBrokerRequest({
      path: "/Users/AccessToken",
      method: "DELETE",
      accessToken,
    });
  } catch {
    // Token may already be expired; disconnect should still succeed.
  }
}

export async function getAccountInfo(accessToken: string): Promise<GunBrokerAccount> {
  const payload = await gunBrokerRequest({
    path: "/Users/AccountInfo",
    accessToken,
  });
  const user = pickField(payload, "user", "User") ?? payload;
  const firstName = asString(pickField(user, "firstName", "FirstName"));
  const lastName = asString(pickField(user, "lastName", "LastName"));
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

  return {
    userId: asString(pickField(user, "userID", "UserID", "userId")),
    userName: asString(pickField(user, "userName", "UserName", "username")),
    displayName,
  };
}

export async function getAccountPayload(accessToken: string) {
  return gunBrokerRequest({
    path: "/Users/AccountInfo",
    accessToken,
  });
}

export async function getContactInfo(accessToken: string) {
  return gunBrokerRequest({
    path: "/Users/ContactInfo",
    accessToken,
  });
}

export async function listItemsSelling(
  accessToken: string,
  pageIndex: number,
  pageSize = 300,
) {
  try {
    const payload = await gunBrokerRequest({
      path: "/ItemsSelling",
      accessToken,
      query: { PageIndex: pageIndex, PageSize: pageSize },
    });
    const results = asList(payload);
    return {
      count: asCount(payload, results.length),
      pageIndex,
      pageSize,
      results,
    };
  } catch (error) {
    if (error instanceof GunBrokerApiError && error.status === 401) throw error;
    if (pageIndex !== 1) throw error;
    const payload = await gunBrokerRequest({
      path: "/ItemsSelling",
      accessToken,
    });
    const results = asList(payload);
    return {
      count: asCount(payload, results.length),
      pageIndex: 1,
      pageSize: results.length || pageSize,
      results,
    };
  }
}

export async function getItem(accessToken: string, itemId: string) {
  return gunBrokerRequest({
    path: `/Items/${encodeURIComponent(itemId)}`,
    accessToken,
  });
}

export async function getItemPictures(accessToken: string, itemId: string) {
  const payload = await gunBrokerRequest({
    path: "/Pictures",
    accessToken,
    query: { ItemID: itemId },
  });
  if (Array.isArray(payload)) return payload;
  const listed = asList(payload);
  if (listed.length) return listed;
  const pictures = pickField(payload, "pictures", "Pictures");
  if (Array.isArray(pictures)) return pictures;
  if (
    payload &&
    typeof payload === "object" &&
    (pickField(payload, "pictureID", "PictureID", "pictureURL", "PictureURL") != null)
  ) {
    return [payload];
  }
  return [];
}

export async function updateItem(
  accessToken: string,
  itemId: string,
  body: Record<string, unknown>,
) {
  return gunBrokerRequest({
    path: `/Items/${encodeURIComponent(itemId)}`,
    method: "PUT",
    accessToken,
    body,
  });
}

export async function endItem(accessToken: string, itemId: string) {
  try {
    return await gunBrokerRequest({
      path: "/Items",
      method: "DELETE",
      accessToken,
      query: { itemIds: itemId },
    });
  } catch (error) {
    if (!(error instanceof GunBrokerApiError) || error.status === 401) throw error;
    return gunBrokerRequest({
      path: `/Items/${encodeURIComponent(itemId)}`,
      method: "DELETE",
      accessToken,
    });
  }
}

export async function getListingDefaults(accessToken: string) {
  return gunBrokerRequest({
    path: "/Listing/Defaults",
    accessToken,
  });
}

export async function createItem(accessToken: string, data: Record<string, unknown>) {
  const form = new FormData();
  form.append(
    "data",
    new Blob([JSON.stringify(data)], { type: "application/json" }),
  );
  const url = `${gunBrokerApiUrl()}/Items`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: headers(accessToken, false),
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new GunBrokerApiError(504, "GunBroker took too long to create the listing.");
    }
    throw error;
  }
  const payload = await parseJson(response);
  if (!response.ok) {
    throw errorFrom(response.status, payload);
  }
  return payload;
}

export async function addItemPictures(
  accessToken: string,
  itemId: string,
  files: File[],
) {
  const form = new FormData();
  for (const file of files) {
    const original = file.name || "photo.jpg";
    const name = /\.gif$/i.test(original)
      ? original
      : `${original.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    const type = /\.gif$/i.test(name) ? "image/gif" : "image/jpeg";
    const bytes = await file.arrayBuffer();
    form.append("picture", new Blob([bytes], { type }), name);
  }
  const url = `${gunBrokerApiUrl()}/Pictures/${encodeURIComponent(itemId)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: headers(accessToken, false),
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new GunBrokerApiError(504, "GunBroker took too long to upload photos.");
    }
    throw error;
  }
  const payload = await parseJson(response);
  if (!response.ok) {
    throw errorFrom(response.status, payload);
  }
  return payload;
}

export async function deleteItemPicture(accessToken: string, pictureId: string) {
  return gunBrokerRequest({
    path: `/Pictures/${encodeURIComponent(pictureId)}`,
    method: "DELETE",
    accessToken,
  });
}
