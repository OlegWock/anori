# Contributing

Hey! I'm happy to see you here. This document outlines contribution guidelines for Anori. I don't want to write a huge doc which requires 30 minutes to read, that's no fun, isn't it? So I'll keep this short.

Contributions (Pull Requests) are very welcome! However, before making any changes, please create an issue describing what you want to add or change. If you want to implement a feature which already has an issue (including those labeled 'Pull requests are welcome'), please let me know, drop a comment in that issue. I'll help you with possible pitfalls and might give you some useful info about implementing this particular feature.

While contributions are welcome, Anori is an opinionated project. We don't try to cater every audience, adding every feature that was requested. And because of this, I ask you to create an issue first. In case you want to add some very specific feature, there are chances it won't be accepted into project, so I don't want you to spend time on feature which won't get into master. You're still free to fork Anori and add your desired feature there, that's totally okay.

When developing, don't introduce new libraries or components without a need. We have a plenty of [ready-made components](src/components/) and utilities. Some of them (most useful I guess) are [documented here](DEVELOPMENT_AND_EXTENDING.md). If there is a need for a new component, make it look like it's part of the extension, reuse styles and CSS variables from other components. Follow structure and code style of the project.