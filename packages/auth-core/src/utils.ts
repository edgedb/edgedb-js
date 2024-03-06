export async function requestGET<ResponseT>(
  href: string,
  searchParams?: Record<string, string>,
  onFailure?: (errorMessage: string) => Promise<ResponseT>
): Promise<ResponseT> {
  const url = new URL(href);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.append(key, value);
    }
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const bodyText = await response.text();
      if (onFailure) {
        return onFailure(bodyText);
      }
      throw new Error(`Failed to fetch ${href}: ${bodyText}`);
    }

    if (response.headers.get("content-type")?.includes("application/json")) {
      return response.json();
    }

    return response.text() as ResponseT;
  } catch (err) {
    if (onFailure) {
      return onFailure((err as Error).message);
    }
    throw err;
  }
}

export async function requestPOST<ResponseT>(
  href: string,
  body?: object,
  onFailure?: (errorMessage: string) => Promise<ResponseT>
): Promise<ResponseT> {
  try {
    const response = await fetch(href, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      ...(body != null
        ? {
            body: JSON.stringify(body),
          }
        : undefined),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      if (onFailure) {
        return onFailure(bodyText);
      }
      throw new Error(`Failed to fetch ${href}: ${bodyText}`);
    }

    if (response.headers.get("content-type")?.includes("application/json")) {
      return response.json();
    }
    return response.text() as ResponseT;
  } catch (err) {
    if (onFailure) {
      return onFailure((err as Error).message);
    }
    throw err;
  }
}
