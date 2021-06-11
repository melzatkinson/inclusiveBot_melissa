//require the packages we need
const core = require('@actions/core');
const github = require('@actions/github');

//put in our list of words
const unfriendlyWords = [
	'banana',
];

//create an asynchronous function that will run when the js file is called
const run = async () => {
	try {
		//call in your token from main.yml
		const token = core.getInput('github_token');
		//we want to instantiate github's octokit to use it within actions
		const octokit = new github.getOctokit(token);

		//we need to know at the time of looking at the PR what the details are
		const { repo, payload } = github.context;
		const owner = payload.repository.owner.login;
		const pull_number = payload.number;
		const repoName = repo.repo;


		//now we need to look through the files of what was added from the PR
		const files = await octokit.rest.pulls.listFiles({
			owner: owner,
			repo: repoName,
			pull_number: pull_number,
		});

		const checkCommit = files.data[0].patch.split('\n');
		console.log(checkCommit, '<<< WHAT IS IN THIS COMMIT');

		//we want to check only lines that were added
		const onlyAddedLines = line => {
			return line.startsWith('+');
		};

		//but we don't care about the plus sign
		const removeFirstPlus = line => {
			return line.substring(1);
		};

		//in the end we are going to put found words in an array with some extra things like status and count
		const extractBadWords = (ExtractedBadWordsArray, line) => {
			for (const unfriendlyWord of unfriendlyWords) {
				if (line.includes(unfriendlyWord)) {
					ExtractedBadWordsArray.push({
						word: unfriendlyWord,
						line: line,
						index: line.indexOf(unfriendlyWord),
						status: true,
						count: ExtractedBadWordsArray.length,
					});
				}
			}
			return ExtractedBadWordsArray;
		};
		console.log(extractBadWords, '<<< WHAT ARE THE BAD WORDS THAT WERE FOUND');

		//based on the above functions we want to run through each line of the commit and
		//check for the unfriendly words we listed at the start of the file
		//and put everything together
		const result = checkCommit
			.filter(onlyAddedLines)
			.map(removeFirstPlus)
			.reduce(extractBadWords, []);

		//we want to be able to flag the specific word in our PR comment
		const wordsFound = result.map(function(el) {
			return el.word;
		});

		//our message could look like this
		const isUnfriendlyComment = `💔 This PR contains some non inclusive or unfriendly terms.
				The following words were found: ${wordsFound}`;

		//now we need a function that will post a comment with the right context
		const newComment = await octokit.rest.issues.createComment({
			owner: owner,
			repo: repoName,
			issue_number: pull_number,
			body: isUnfriendlyComment,
		});

		//we only want it to post if we found words
		if (result[0].status) {
			newComment;
		}

		//let's put something in to complete the try so our action workflow is more tidy
		return 'run complete';
	} catch (error) {
		core.setFailed(error.message);
	}
};

//we want to run our overall function when index.js is called
run();