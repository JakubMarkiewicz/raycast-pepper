import { ActionPanel, Action, List, Icon, Detail, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { parse, HTMLElement } from "node-html-parser";

/** Get proper color based of users score */
function getOfferColor(points: number): Color {
  if (points > 1000) {
    return Color.Red;
  }
  if (points > 500) {
    return Color.Orange;
  }
  if (points < 200) {
    return Color.Blue;
  }
  return Color.PrimaryText;
}

type Score = {
  text: string;
  color: Color;
};

/** Build color and text to display for users score */
function buildScore(score: number): Score {
  return { text: String(score) + "°", color: getOfferColor(score) };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [detail, setDetail] = useState(false);
  const { data, isLoading } = useFetch(
    `https://www.pepper.pl/${searchText?.length !== 0 ? `search?q=${searchText}` : ""}`,
    {
      parseResponse: parseFetchResponse,
      headers: {
        cookie: "hide_expired=%221%22",
      },
    }
  );

  const toggleDetail = () => setDetail((v) => !v);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search items"
      isShowingDetail={detail}
      filtering={false}
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem
            key={searchResult.title}
            searchResult={searchResult}
            toggleDetail={toggleDetail}
            detail={detail}
          />
        ))}
      </List.Section>
    </List>
  );
}

type SearchListItemProps = { searchResult: Deal; detail: boolean; toggleDetail(): void };

function SearchListItem({ searchResult, detail, toggleDetail }: SearchListItemProps) {
  const score = buildScore(searchResult.points);
  const props = detail
    ? {
        detail: (
          <List.Item.Detail
            metadata={
              <Detail.Metadata>
                <Detail.Metadata.Label title="Price" text={searchResult.price} icon={Icon.Coins} />
                <Detail.Metadata.Label
                  title="Old Price"
                  text={searchResult.oldPrice}
                  icon={{ source: Icon.Coins, tintColor: { light: "#aa3333", dark: "#aa3333" } }}
                />
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Score">
                  <Detail.Metadata.TagList.Item text={score.text} color={score.color} />
                </Detail.Metadata.TagList>
                <Detail.Metadata.Label title="User" text={searchResult.user} icon={Icon.Person} />
                <Detail.Metadata.Label title="Merchant" text={searchResult.merchant} icon={Icon.Dot} />
              </Detail.Metadata>
            }
            markdown={`#### ${searchResult.title}\n![Illustration >](${searchResult.img})\n\n${searchResult.description}`}
          />
        ),
      }
    : { accessories: [{ tag: { color: score.color, value: score.text } }], subtitle: searchResult.price };
  return (
    <List.Item
      {...props}
      title={searchResult.title}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.href} />
            <Action title="Toggle Detail" icon={Icon.Desktop} onAction={toggleDetail} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

type Deal = {
  title: string;
  price: string;
  oldPrice: string;
  points: number;
  href: string;
  img: string;
  user: string;
  merchant: string;
  description: string;
};

/** fallback if text is not present */
function fallback(text?: string, fallback = "--"): string {
  return text?.trim() ?? fallback;
}

/** Build readabale data object of an offer */
function buildRecord(article: HTMLElement): Deal {
  const q = (query: string) => article.querySelector(query);
  const href = q("a.thread-link")?.rawAttributes;
  const price = fallback(q(".thread-price")?.childNodes[0]?.rawText);
  const points = Number(fallback(q(".cept-vote-temp")?.rawText?.trim()?.slice(0, -1), "0"));
  const img = fallback(q("img.thread-image")?.rawAttributes?.src).replace("300x300", "100x100");
  const user = fallback(q("span.thread-username")?.rawText);
  const merchant = fallback(q("span.cept-merchant-name")?.rawText);
  const oldPrice = fallback(q("span.mute--text")?.rawText);
  const description = fallback(q("div.userHtml-content > div")?.childNodes[0]?.rawText);

  return {
    title: fallback(href?.title),
    description,
    price,
    oldPrice,
    points,
    href: fallback(href?.href, "https://pepper.pl"),
    img,
    merchant,
    user,
  };
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response): Promise<Deal[]> {
  const awaited = await response.text();
  const parsed = parse(awaited);
  const articles = parsed.querySelectorAll("article.thread--deal");
  const dealsData = articles.map((article) => buildRecord(article));

  return dealsData;
}
