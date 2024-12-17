local this = {}

---@param env Env
function this.init(env)
  this.lookup_tags = { "extra" }
  ---@type { string : string }
  this.radicals = {}
  local path = rime_api.get_user_data_dir() .. "/lua/c42/assembly.txt"
  local file = io.open(path, "r")
  if not file then
    return
  end
  for line in file:lines() do
    ---@type string, string
    local char, radical = line:match("([^\t]+)\t([^\t]+)")
    this.radicals[char] = radical
  end
  file:close()
end

---@param segment Segment
---@param env Env
function this.tags_match(segment, env)
  for _, value in ipairs(this.lookup_tags) do
    if segment.tags[value] then
      return true
    end
  end
  return false
end

---@param translation Translation
---@param env Env
function this.func(translation, env)
  for candidate in translation:iter() do
    local radical = this.radicals[candidate.text]
    if radical then
      candidate.comment = candidate.comment .. string.format("［%s］", this.radicals[candidate.text])
    end
    yield(candidate)
  end
  return
end

return this
