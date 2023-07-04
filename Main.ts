import Express, { json as ParseJSON } from "express";
import Helmet from "helmet";
import { PushEvent } from "@octokit/webhooks-types";
import { EmbedBuilder } from "@oceanicjs/builders";
import { request } from "undici";

// turn Config.example.ts to Config.ts first
import { serverPort, ltdGitHubOwner, webhookList } from "./Config";

const app = Express();

// basic security
app.use(Helmet());

// json parse
app.use(ParseJSON());

// redirect to github repository instead
app.get("/", async (_, res) => res.redirect("https://github.com/ray-1337/discord-github-commit-webhook"))

// https://yourdomain.com/webhook/somerepopath
app.post("/:mortem", async (req, res) => {
  try {
    const { mortem } = req.params;
    if (!mortem) return res.status(400).send("invalid mortem.");

    const webhooksMortem = webhookList?.[mortem];
    if (!webhooksMortem?.length) {
      return res.status(403).send(`[${mortem}] is not a whitelisted mortem.`);
    };

    const eventType = req.headers?.["x-github-event"];
    if (!eventType?.length) {
      return res.status(403).send("no github event presented.");
    };

    // github ping you after submitting your webhook
    if (eventType === "ping") {
      return res.sendStatus(200);
    };

    // i only need "push" event
    if (eventType !== "push") {
      return res.status(403).send("only expect \"push\" from github event.")
    };

    const body: PushEvent = req.body;
    if (!body?.repository?.owner) {
      return res.status(403).send("invalid repository owner.")
    };

    if (!ltdGitHubOwner?.length || !ltdGitHubOwner.some(ownerName => ownerName === body.repository.owner.name)) {
      return res.status(403).send("mismatched github repository owner.");
    };

    if (!body?.sender?.id) {
      return res.status(403).send("no sender presented.");
    };

    if (!body?.commits?.length) {
      return res.status(403).send("no commits presented.");
    };

    const commitMessageLimit = 75;
    const commitsListLimit = 15;

    const commitsMap = body.commits.slice(0, commitsListLimit).map(commit => {
      return `- [\`${commit.id.slice(0, 6)}\`](${commit.url}) ${truncate(commit.message, commitMessageLimit)}${commit.committer?.username ? ` - ${commit.committer.username}` : ""}`;
    });

    const embedColor = 0x5865F2; // https://discord.com/branding
    const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor(body.sender.login, body.sender.avatar_url, body.sender.html_url)
    .setTitle(`${body.commits.length} new ${body.commits.length <= 1 ? "commit" : "commits"}, presented by ${body.sender.login}`)
    .setURL(body.compare)
    .setTimestamp(new Date())
    .addField("Repository/Branches", `${body.repository.name}/${body.ref.split("/")?.pop() || body.ref}`)
    .addField(`Commits [${body.commits.length}]`, commitsMap.join("\n"));

    const webhookProfilePicture = "https://cdn.discordapp.com/avatars/1037833960673259581/df91181b3f1cf0ef1592fbe18e0962d7.png?size=128";
    const webhookName = "GitHub";
    
    for await (const webhook of webhooksMortem) {
      try {
        await request(webhook, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            username: webhookName,
            avatar_url: webhookProfilePicture,
            embeds: embed.toJSONRaw(true)
          })
        });
      } catch (error) {
        console.error(error);
      };
    };

    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  };
});

app.listen(serverPort, () => console.log(`API connected with port ${serverPort}`));

function truncate(str: string, limit: number) {
  return str.length > limit ? str.slice(0, limit) + "..." : str;
};