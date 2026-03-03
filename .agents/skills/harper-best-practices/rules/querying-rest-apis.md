---
name: querying-rest-apis
description: How to use query parameters to filter, sort, and paginate Harper REST APIs.
---

# Querying REST APIs

Instructions for the agent to follow when querying Harper's REST APIs.

## When to Use

Use this skill when you need to perform advanced data retrieval (filtering, sorting, pagination, joins) using Harper's automatic REST endpoints.

## Steps

1. **Basic Filtering**: Use attribute names as query parameters: `GET /Table/?key=value`.
2. **Use Comparison Operators**: Append operators like `gt`, `ge`, `lt`, `le`, `ne` using FIQL-style syntax: `GET /Table/?price=gt=100`.
3. **Apply Logic and Grouping**: Use `&` for AND, `|` for OR, and `()` for grouping: `GET /Table/?(rating=5|featured=true)&price=lt=50`.
4. **Select Specific Fields**: Use `select()` to limit returned attributes: `GET /Table/?select(name,price)`.
5. **Paginate Results**: Use `limit(count)` or `limit(offset, count)`: `GET /Table/?limit(20, 10)`.
6. **Sort Results**: Use `sort()` with `+` (asc) or `-` (desc): `GET /Table/?sort(-price,+name)`.
7. **Query Relationships**: Use dot syntax for tables linked with `@relationship`: `GET /Book/?author.name=Harper`.
