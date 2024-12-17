local c42 = {
    kRejected = 0,
    kAccepted = 1,
    kNoop = 2,
    kVoid = "kVoid",
    kGuess = "kGuess",
    kSelected = "kSelected",
    kConfirmed = "kConfirmed",
    kNull = "kNull",     -- 空節點
    kScalar = "kScalar", -- 純數據節點
    kList = "kList",     -- 列表節點
    kMap = "kMap",       -- 字典節點
    kShift = 0x1,
    kLock = 0x2,
    kControl = 0x4,
    kAlt = 0x8,
}

--- 取出输入中当前正在翻译的一部分
---@param context Context
function c42.current(context)
    local segment = context.composition:toSegmentation():back()
    if not segment then
        return nil
    end
    return context.input:sub(segment.start + 1, segment._end)
end

---格式化 Info 日志
---@param format string|number
function c42.infof(format, ...)
    log.info(string.format(format, ...))
end

---格式化 Warn 日志
---@param format string|number
function c42.warnf(format, ...)
    log.warning(string.format(format, ...))
end

---格式化 Error 日志
---@param format string|number
function c42.errorf(format, ...)
    log.error(string.format(format, ...))
end

return c42
