-- 按键绑定处理器
-- 目前仅处理空格，在四码时用于选二重

local c42 = require "c42.c42"

local this = {}

---@param env Env
function this.init(env)
end

---@param key_event KeyEvent
---@param env Env
function this.func(key_event, env)
  local input = c42.current(env.engine.context)
  if not input then
    return c42.kNoop
  end
  if not env.engine.context.composition:back():has_tag("abc") then
    return c42.kNoop
  end
  if key_event:repr() == "space" and input:len() == 4 then
    env.engine.context:select(1)
    env.engine.context:confirm_current_selection()
    return c42.kAccepted
  end
  return c42.kNoop
end

return this