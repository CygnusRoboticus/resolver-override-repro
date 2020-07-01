"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_1 = require("apollo-server");
const graphql_tools_1 = require("graphql-tools");
const graphql_1 = require("graphql");
const node_fetch_1 = __importDefault(require("node-fetch"));
const bookTypeDefs = apollo_server_1.gql `
    type Query {
        book: Book
    }
    type Book {
        _id: ID!
        category: String!
    }
`;
const authorTypeDefs = apollo_server_1.gql `
    type Query {
        author: Author
    }
    type Author {
        _id: ID!
        name: String!
    }
`;
const bookResolvers = {
    Query: {
        book: () => ({ _id: "1", category: "Test" }),
    },
    Book: {
        category: (obj) => obj.category.toUpperCase(),
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
            resolve: (obj) => obj.name.toUpperCase(),
        },
        // overwritten resolver
        name: (obj) => obj.name.toUpperCase(),
    },
};
const bookSchema = graphql_tools_1.makeExecutableSchema({
    typeDefs: bookTypeDefs,
    resolvers: bookResolvers,
});
const remoteAuthorSchema = graphql_tools_1.makeExecutableSchema({
    typeDefs: authorTypeDefs,
    resolvers: remoteAuthorResolvers,
});
const authorSchema = apollo_server_1.gql `
    extend type Author {
        nameUpper: String!
    }
`;
const authorExecutor = ({ document, variables }) => __awaiter(void 0, void 0, void 0, function* () {
    return node_fetch_1.default("http://localhost:4001/", {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            query: graphql_1.print(document),
            variables,
        }),
    }).then(resp => resp.json());
});
const remoteServer = new apollo_server_1.ApolloServer({
    schema: remoteAuthorSchema,
});
remoteServer
    .listen({ port: 4001 })
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    const schema = yield graphql_tools_1.introspectSchema(authorExecutor);
    const server = new apollo_server_1.ApolloServer({
        schema: graphql_tools_1.stitchSchemas({
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
}))
    .catch(console.log);
//# sourceMappingURL=index.js.map