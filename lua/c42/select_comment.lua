local this = {}

---@param env Env
function this.init(env)
end

---@param segment Segment
---@param env Env
function this.tags_match(segment, env)
  return segment:has_tag("abc") or segment:has_tag("punct")
end

---@param translation Translation
---@param env Env
function this.func(translation, env)
  local context = env.engine.context
  if context:get_option("encode") then
    local segment = context.composition:toSegmentation():back()
    if segment then
      segment.prompt = "［造词］"
    end
  end
  local i = 0
  local input = context.input
  local select_keys = ""
  if input:sub(-1, -1):find("[qwertasdfgzxcvb]") then
    select_keys = "09876"
  else
    select_keys = "23456"
  end
  for candidate in translation:iter() do
    local key = select_keys:sub(i, i)
    if i == 0 then
      goto continue
    end
    if key == "" then
      goto continue
    end
    if candidate.comment == "" then
      candidate.comment = key
    else
      candidate.comment = candidate.comment .. " " .. key
    end
    ::continue::
    i = i + 1
    yield(candidate)
  end
end

return this
