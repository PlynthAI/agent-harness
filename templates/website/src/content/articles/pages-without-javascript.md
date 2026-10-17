---
title: Why most pages here ship no JavaScript, and when one should
description: Pages here are built to HTML ahead of time, and only the parts that must respond load a script. How that works, and how to decide when a page needs one.
published: 2026-10-08
---

Open any article on this site with your browser's network panel and you will find HTML, a stylesheet and font files. There is no script. The pages are rendered once, when the site is built, and every reader receives the same finished document. That is the default in Astro, the framework behind this site, and it suits pages whose job is to be read.

## What a page gains without a script

A page that is finished on arrival has nothing left to do after it loads. It shows its content as soon as the HTML and the stylesheet arrive, it does not shift while code runs, and it works on a slow phone, an old browser or a connection that drops halfway. Navigation is ordinary links, so the back button, opening a link in a new tab and sharing an address all behave as people expect.

It is also easier to keep correct. A page without client code cannot fail because a script did, and there is no state in the browser that can drift from what the server meant to show.

## Islands: interactivity where it is needed

Some parts of a page do need to respond. The contact form on this site checks what you type and shows an answer without reloading the page. For those parts, Astro uses islands: a component is rendered to HTML with the rest of the page, then a small script loads for that component alone and makes it interactive. The rest of the page stays static.

The contact page shows the pattern. The form is a React component, and the page asks for it to load in the browser with one attribute:

```astro
<ContactForm client:load />
```

Remove the attribute and the form still renders, but as static HTML that cannot respond. Other directives load the script later, for example only once the component scrolls into view.

## Deciding whether a part needs a script

Ask what the reader does with it. If they only read it, follow a link or submit a form to a server, it needs no script. If it must respond to them in place, as a filter, a calculator, a chart they can explore or a form that checks itself, it is an island.

Two cautions keep islands simple:

1. **Islands do not share state by default.** Each island is a separate application. Controls that change each other, such as a filter and the chart it filters, belong in one island, or they need an explicit shared store.
2. **An island's size is paid by every visitor to that page.** Prefer the smallest component that does the job, and load it as late as the page allows.

When most of a product is interactive and its parts constantly talk to each other, a single client application can be the simpler choice. For a site made of pages to read, static HTML with a few islands is hard to beat.
