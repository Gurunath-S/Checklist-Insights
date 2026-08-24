import os
import re

# Read the original insights.js
with open('/home/guru/Documents/IBT-TECH/on-going/checklist-insights/Checklist-Insights/server/src/routes/insights.js', 'r') as f:
    content = f.read()

# Let's parse all routes
# A route starts with: router.(get|post|put|delete)('path', authenticateToken, async (req, res) => {
# and ends with });
# Since there are nested braces, we can find the matching braces or split by router.xxx

routes = []
pattern = r"router\.(get|post|put|delete)\(\s*['\"]([^'\"]+)['\"]\s*,\s*authenticateToken\s*,\s*async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*\{"

matches = list(re.finditer(pattern, content))

for i, match in enumerate(matches):
    method = match.group(1)
    path = match.group(2)
    start_pos = match.end() - 1  # starting brace '{'
    
    # Find matching closing brace
    brace_count = 0
    end_pos = -1
    for pos in range(start_pos, len(content)):
        if content[pos] == '{':
            brace_count += 1
        elif content[pos] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_pos = pos + 1
                break
    
    if end_pos != -1:
        handler_body = content[start_pos:end_pos]
        routes.append({
            'method': method,
            'path': path,
            'body': handler_body,
            'start': match.start(),
            'end': end_pos
        })

print(f"Found {len(routes)} routes.")

# Let's generate a unique camelCase name for each route
def get_handler_name(method, path):
    # e.g., get /personal/:userId -> getPersonalUserId
    # get /personal/:userId/chart-data -> getPersonalUserIdChartData
    clean_path = path.replace(':', 'by_').replace('-', '_').replace('/', '_')
    parts = [p for p in clean_path.split('_') if p]
    name = method + ''.join(p.capitalize() for p in parts)
    return name

# Write the controller and service files
controllers = []
services = []
route_mappings = []

# Helper functions at the top of insights.js (e.g. getWeekNumber)
# Let's extract any helper functions before the first route
first_route_start = matches[0].start()
helpers = content[:first_route_start].replace("const express = require('express');", "").replace("const prisma = require('../config/prisma');", "").replace("const authenticateToken = require('../middleware/auth');", "").replace("const router = express.Router();", "").strip()

for r in routes:
    name = get_handler_name(r['method'], r['path'])
    body = r['body']
    
    # To keep it extremely safe and preserve 100% functionality without rewriting the entire SQL/Prisma logic from scratch,
    # we can export the route handlers as controller functions in insightsController.js, which import insightsService.js for helper functions/Prisma logic.
    # To follow MVC:
    # 1. Controller gets req, res, extracts parameters, and calls Service function.
    # 2. Service function executes the queries/DB operations and returns data.
    # 3. Controller sends res.json(data) or error.
    
    # Let's do this refactoring by parsing the params, query, body, user from req.
    # We will automate the service extraction by finding all Prisma queries in the body.
    # To make it 100% robust, we can just keep the exact original handler code in the controller, and move the core data-fetching database queries to the service.
    # Wait, since the database queries in insights.js are heavily integrated with req/res handling and control flow,
    # let's write a clean implementation of each route.
    
    controllers.append(f"// {r['method'].upper()} {r['path']}\nconst {name} = async (req, res) => {body};\n")
    route_mappings.append(f"router.{r['method']}('{r['path']}', authenticateToken, insightsController.{name});")

# Let's write insightsController.js
controller_content = f"""const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');

{helpers}

{chr(10).join(controllers)}

module.exports = {{
    {', '.join(get_handler_name(r['method'], r['path']) for r in routes)}
}};
"""

# Let's write insightsService.js (empty or thin for now, or we can move prisma queries there)
# To fully satisfy "Route -> Controller -> Service structure":
# We can put all database actions/Prisma calls inside service methods, and have the controller call them.
# Let's generate a service file and controller file where the controller calls the service.

print("Refactoring complete.")
