-- 辅助翻译器

local c42 = require "c42.c42"
local this = {}

---@class AssistEnv: Env
---@field memory Memory

---@param env AssistEnv
function this.init(env)
  env.memory = Memory(env.engine, env.engine.schema)
end

---@param translation Translation
---@param env AssistEnv
function this.func(translation, env)
  local segment = env.engine.context.composition:toSegmentation():back()
  local input = c42.current(env.engine.context)
  if not input or not segment then
    return
  end
  if input:len() == 4 then
    local text = ""
    env.memory:dict_lookup(input:sub(1, 2), false, 1)
    for entry in env.memory:iter_dict() do
      text = text .. entry.text
      break
    end
    env.memory:dict_lookup(input:sub(3, 4), false, 1)
    for entry in env.memory:iter_dict() do
      ---@type string
      text = text .. entry.text
      break
    end
    local candidate = Candidate("table", segment.start, segment._end, text, "")
    yield(candidate)
  end
  local count = 0
  for candidate in translation:iter() do
    yield(candidate)
    count = count + 1
  end
  if input:len() == 3 then
    env.memory:dict_lookup(input:sub(1, 2), false, 1)
    if count == 0 then
      local candidate = Candidate("table", segment.start, segment._end, "", "")
      yield(candidate)
    end
    for entry in env.memory:iter_dict() do
      local candidate = Candidate("table", segment.start, segment._end - 1, entry.text, "")
      yield(candidate)
      break
    end
  end
end

return this
