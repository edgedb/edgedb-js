# @edgedb/auth-core: Core helper library for the EdgeDB Auth extension

> Warning: This library is still in an alpha state, and so, bugs are likely and the api's should be considered unstable and may change in future releases.

This library contains some low-level utilities to help working with the EdgeDB auth extension; namely resolving the api endpoint urls from an edgedb `Client` object, providing wrappers around those api's to help handle the various auth flows (including handling PKCE), and adding typesafety.

It is recommended to instead use the separate helper libraries created to make integration with popular frameworks as easy as possible. Currently supported frameworks:

- Next.js (@edgedb/auth-nextjs)
- _...more coming soon_
