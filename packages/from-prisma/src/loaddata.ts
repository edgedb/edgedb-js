import { PrismaClient, Visibility } from '@prisma/client'
import { Dictionary } from './utils'


const prisma = new PrismaClient()
const badge: Dictionary<number> = {}
const status: Dictionary<number> = {}
const user: Dictionary<number> = {}
var curTime: Date = new Date(2023, 11, 21, 13)


function normText(text: string): string {
    return text.replace(/\s+/gi, ' ')
}


async function initUsers() {
  await prisma.badge.createMany({
    data: [{
      name: 'admin',
      description: 'Superuser who can do anything',
    }, {
      name: 'moderator',
      description: "User who can edit other user's posts",
    }],
  })
  await prisma.badge.findMany().then((res) => {
    res.forEach((el) => {
        badge[el.name] = el.id
    })
  })

  await prisma.status.createMany({
    data: [{
      title: 'happy',
    }, {
      title: 'sad',
    }, {
      title: 'excited',
    }, {
      title: 'mad',
    }],
  })
  await prisma.status.findMany().then((res) => {
    res.forEach((el) => {
        status[el.title] = el.id
    })
  })

  await prisma.user.createMany({
    data: [{
      name: 'Alice',
      email: 'alice@somewhere.com',
      password:
        'cf9c1cb89584bf8c4176a37c2c954a8dc56077d3ba65ee44011e62ab7c63ce2d',
      client_settings: {
        theme: "dark",
        phone: {"minimalist": true},
      },
    }, {
      name: 'Billie',
      email: 'billie@other.com',
      password:
        'a5e7c002443743c5836758c7d1cd8ddefd9fcf2061daa0efaac683fb99966057',
      client_settings: {
        theme: "light",
        desktop: {
          show_sidebar: true,
          show_bookmarks: false,
          threads: "collapsed",
        },
      },
      statusId: status['excited'],
    }, {
      name: 'Cameron',
      email: 'cameron@edgedb.com',
      password:
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      client_settings: {
        theme: "blue",
        phone: {minimalist: false},
        desktop: {
            show_sidebar: true,
            show_bookmarks: true,
            threads: "expanded",
        },
      },
      badgeId: badge['admin'],
    }, {
      name: 'Dana',
      email: 'dana@somewhere.com',
      password:
        'e87f01780fe6ce8772b68e35cb3431e8ef982b9b13f18d681f4c1187830b21eb',
      client_settings: {
        theme: "light",
        phone: {"minimalist": false},
      },
      badgeId: badge['moderator'],
      statusId: status['mad'],
    }],
  })
  await prisma.user.findMany().then((res) => {
    res.forEach((el) => {
        user[el.name] = el.numId
    })
  })
}


async function post(
    userId: number,
    body: string,
    threadId?: number | null,
    replyToId?: number | null,
): Promise<number> {
  let val = await prisma.post.create({
    data: {
      body: body,
      userId: userId,
      threadId: threadId,
      replyToId: replyToId,
      creation_time: curTime,
    }
  })
  curTime = new Date(curTime.getTime() + (Math.random() * 600 + 30) * 1000)

  return val.id
}


async function loadPosts(
    posts: string[][],
    threadId?: number,
    asReplies?: boolean,
) {
  let prevId: number | null = null
  for (let el of posts) {
    prevId = await post(
      user[el[0]],
      normText(el[1].trim()),
      threadId,
      asReplies ? prevId : null,
    )
  }
}


async function loadThread(
    title: string | null,
    posts: string[][],
) {
  let thread = await prisma.thread.create({
    data: {
      title: title
    }
  })

  loadPosts(posts, thread.id)
}


async function createBookmarks() {
  for (let pid of [37, 43]) {
    await prisma.bookmarks.create({
      data: {
        userId: user['Alice'],
        postId: pid,
      },
    })
  }

  for (let {pid, note} of [{pid: 1, note: 'rendering glitch'},
                           {pid: 38, note: 'follow-up'},
                           {pid: 35, note: null}]) {
    await prisma.bookmarks.create({
      data: {
        userId: user['Cameron'],
        postId: pid,
        note: note,
      },
    })
  }
}


async function createEdits() {
  for (let pid of [4, 8, 11, 15, 16, 24, 25, 27, 37, 41]) {
    let post = await prisma.post.findUnique({
      where: {id: pid}
    })
    await prisma.post.update({
      data: {
        edited_time: new Date(
          post!.creation_time.getTime() + (Math.random() * 1000 + 30) * 1000
        )
      },
      where: {id: pid}
    })
  }
}


async function tweakVisibility() {
  for (let {pid, vis} of [{pid: 27, vis: Visibility.High},
                          {pid: 51, vis: Visibility.Low},
                          {pid: 2, vis: Visibility.None}]) {
    await prisma.post.update({
      data: {
        visibility: vis,
      },
      where: {id: pid}
    })
  }
}


async function main() {
  console.log('Loading data...')

  await initUsers()
  await loadPosts([
    ['Alice', `
        Hey everyone! How's your day going?
    `],
    ['Billie', `
        Hey Alice! Not bad, just surviving Monday. How about you?
    `],
    ['Cameron', `
        Mondays are always a struggle, but hanging in there. Anyone do
        anything exciting over the weekend?
    `],
    ['Dana', `
        Not much for me. Just caught up on some Netflix and had a lazy
        Sunday.
    `],
    ['Alice', `
        Nice! Sometimes a lazy Sunday is the best kind. I went hiking
        on Saturday, so I'm feeling pretty accomplished.
    `],
    ['Billie', `
        That sounds amazing, Alice! Where did you go hiking?
    `],
    ['Alice', `
        Just a local trail, nothing too intense. It was more about
        enjoying the fall foliage than anything else.
    `],
    ['Cameron', `
        Fall hikes are the best. I love the crisp air and the colors.
        Did you take any cool photos?
    `],
    ['Alice', `
        Definitely! I'll share them in a bit. How about you, Cameron?
        Anything interesting on your end?
    `],
    ['Cameron', `
        Went to a concert on Friday night. It was a blast! The band
        played some old classics, and the energy was incredible.
    `],
    ['Dana', `
        That sounds awesome! I haven't been to a live concert in ages.
        Who was playing?
    `],
    ['Cameron', `
        It was a local indie band, actually. They're called "Echo
        Bloom." Really talented group.
    `],
    ['Billie', `
        I'll have to check them out. Always looking for new music.
        Dana, what about you? Any weekend highlights?
    `],
    ['Dana', `
        Not much, just some shopping and cleaning. Adulting at its
        finest, you know?
    `],
    ['Alice', `
        Totally get that, Dana. Adulting can be a drag sometimes.
    `],
    ['Billie', `
        True that. Anyone up for grabbing coffee this week? I could
        use some caffeine to get through the work grind.
    `],
    ['Cameron', `
        I'm in! How about Wednesday after work?
    `],
    ['Dana', `
        Works for me. Let's make it happen!
    `],
    ['Alice', `
        Count me in too. Looking forward to it!
    `],
    ['Billie', `
        Great! It's a coffee date then. Anything specific you guys
        want to catch up on?
    `],
    ['Cameron', `
        Maybe we can plan a weekend getaway or something. It's been
        ages since we did something together.
    `],
    ['Dana', `
        That sounds like a plan! Let's discuss it more on Wednesday.
        Can't wait!
    `],
    ['Alice', `
        Agreed! Wednesday coffee and weekend getaway planning. Perfect
        combo!
    `],
    ['Billie', `
        Exciting times ahead! See you all then.
    `],
  ])

  await loadThread('Badges', [
    ['Cameron', `
        Hey, everyone! Quick heads up—I wanted to chat about the
        "admin" and "moderator" badges you might have noticed.
    `],

    ['Cameron', `
        So, the "admin" badge is for users who have full control over
        the platform. They can manage users, settings, and basically
        have the highest level of authority.
    `],

    ['Billie', `
        Got it. And what about the moderator badge? I noticed someone
        has that one too.
    `],

    ['Cameron', `
        The moderator badge is for users with the responsibility of
        keeping things in check within specific communities. They can
        moderate discussions, handle reported content, and ensure the
        community guidelines are followed.
    `],

    ['Alice', `
        Ah, so admins are like the overall rulers, and moderators are
        like the guardians of specific areas?
    `],

    ['Cameron', `
        Exactly! Admins have control over the entire platform, while
        moderators focus on maintaining order and a positive
        atmosphere within their assigned communities.
    `],

    ['Billie', `
        That makes sense. How do you become an admin or a moderator?
    `],

    ['Cameron', `
        Typically, it's a combination of trust, experience, and a
        demonstrated commitment to the community. Admins are usually
        platform-wide, while moderators are often chosen by community
        leaders or admins within specific groups.
    `],
  ])

  await loadThread('EdgeDB', [
    ["Alice", `
        Hey, have either of you tried out EdgeDB for databases?
    `],
    ["Billie", `
        Yeah, I gave it a shot recently. It's pretty interesting, actually.
    `],
    ["Dana", `
        Funny you ask, Alice. I actually work at EdgeDB!
    `],
    ["Alice", `
        Oh, wow! Billie, what was your experience like?
    `],
    ["Billie", `
        It was surprisingly smooth. I loved the built-in schema system and
        how it combines the best of both SQL and NoSQL worlds.
    `],
    ["Dana", `
        Glad to hear you had a positive experience, Billie. Alice, if you
        have any questions, feel free to ask. I'm here to help.
    `],
    ["Alice", `
        Thanks! I'm just getting started with databases, so I might need
        some guidance. What sets EdgeDB apart?
    `],
    ["Dana", `
        Well, EdgeDB has a strong focus on developer experience. The
        schema system is designed to be intuitive, and the EdgeQL language
        is powerful yet easy to learn.
    `],
    ["Billie", `
        And the fact that Dana works there is a pretty good endorsement,
        don't you think?
    `],
    ["Alice", `
        Definitely! It's always helpful to have someone on the inside.
        Dana, any tips for a beginner like me?
    `],
    ["Dana", `
        Sure thing, Alice. There's a "Get Started" section on our website.
        That'll give you a good sense of how things work. You can also
        play around with our interactive "EdgeQL Tutorial" which you can
        do without having to install anyting. And don't hesitate to reach
        out if you have any questions along the way.
    `],
    ["Alice", `
        Looks like I've got a mentor for my next project!
    `],
    ["Dana", `
        My pleasure! Happy coding, you two. Let me know if you need
        anything.
    `]
  ])

  await loadPosts([
    ["Alice", `
        Hey, guys! Thinking about getting pineapple on my pizza tonight.
        What do you think?
    `],
    ["Billie", `
        Pineapple on pizza? No way! It's a crime against taste buds.
    `],
    ["Alice", `
        Really? I thought it might be a sweet and savory combo. What's the
        big issue?
    `],
    ["Cameron", `
        Actually, I'm a fan of pineapple on pizza. It's a tasty sweet and
        savory combo.
    `],
    ["Billie", `
        The sweetness of pineapple just doesn't belong with the savory
        goodness of pizza, in my opinion.
    `],
    ["Cameron", `
        It's all subjective. Some folks love it. I'm in the 'love it'
        camp.
    `],
  ], undefined, true)

  await createBookmarks()
  await createEdits()
  await tweakVisibility()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })