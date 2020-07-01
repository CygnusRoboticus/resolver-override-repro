import { ApolloServer, gql } from "apollo-server";
import {
    makeExecutableSchema,
    stitchSchemas,
    ExecutionParams,
    ExecutionResult,
    introspectSchema,
    getResponseKeyFromInfo,
    defaultMergedResolver,
} from "graphql-tools";
import { print, GraphQLResolveInfo } from "graphql";
import fetch from "node-fetch";

interface Author {
    _id: string;
    name: string;
    tags: AuthorTag[];
}

interface AuthorTag {
    name: string;
    kind: string;
}

interface Book {
    _id: string;
    category: string;
}

const bookTypeDefs = gql`
    type Query {
        book: Book
    }
    type Book {
        _id: ID!
        category: String!
    }
`;

const authorTypeDefs = gql`
    type Query {
        author: Author
    }
    type Author {
        _id: ID!
        name: String!
        tags: [AuthorTag!]!
    }
    type AuthorTag {
        name: String!
        kind: String!
    }
`;

const bookResolvers = {
    Query: {
        book: () => ({ _id: "1", category: "Test" }),
    },
    Book: {
        category: (obj: Book) => obj.category.toUpperCase(),
    },
};

const remoteAuthorResolvers = {
    Query: {
        author: () => ({
            _id: "author-1",
            name: "hello author",
            tags: [
                { name: "horror", kind: "genre" },
                { name: "comedy", kind: "genre" },
            ],
        }),
    },
};

const authorResolvers = {
    Author: {
        // new resolver
        nameUpper: {
            selectionSet: `{ name }`,
            resolve: (obj: Author) => obj.name.toUpperCase(),
        },

        // overwritten resolvers
        name: (obj: Author) => obj.name.toUpperCase(),

        // manually correcting alias
        // name: (obj: Author, _: unknown, __: unknown, info: GraphQLResolveInfo) => {
        //     const key = getResponseKeyFromInfo(info);
        //     return obj[key].toUpperCase();
        // },

        tags: (obj: Author, args: {}, context: {}, info: GraphQLResolveInfo) => {
            const tags: AuthorTag[] = defaultMergedResolver(obj, args, context, info);

            return tags.map(t => ({
                extraProp: true,
                ...t,
            }));
        },
    },
    AuthorTag: {
        name: (obj: AuthorTag) => obj.name.toUpperCase(),
    },
};

const bookSchema = makeExecutableSchema({
    typeDefs: bookTypeDefs,
    resolvers: bookResolvers,
});

const remoteAuthorSchema = makeExecutableSchema({
    typeDefs: authorTypeDefs,
    resolvers: remoteAuthorResolvers,
});

const authorSchema = gql`
    extend type Author {
        nameUpper: String!
    }
`;

const authorExecutor = async ({ document, variables }: ExecutionParams<any, {}>): Promise<ExecutionResult<any>> => {
    return fetch("http://localhost:4001/", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            query: print(document),
            variables,
        }),
    }).then(resp => resp.json());
};

const remoteServer = new ApolloServer({
    schema: remoteAuthorSchema,
});

remoteServer
    .listen({ port: 4001 })
    .then(async () => {
        const schema = await introspectSchema(authorExecutor);
        const server = new ApolloServer({
            schema: stitchSchemas({
                schemas: [bookSchema, authorSchema],
                subschemas: [{ schema, executor: authorExecutor }],
                resolvers: [bookResolvers, authorResolvers],
            }),
        });

        return server
            .listen({ port: 4000 })
            .then(() => {
                console.log("up");
            })
            .catch(console.log);
    })
    .catch(console.log);
