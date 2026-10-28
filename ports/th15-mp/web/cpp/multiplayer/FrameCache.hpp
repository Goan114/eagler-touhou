#pragma once
#include <type_traits>

namespace th15::multiplayer {
// Confirmed journals keep their high-water buffers for cheap combat captures.
// A loading boundary needs that space for the next resource factory instead.
// A valid journal or a retained speculative image must remain restorable.
template<class Frames> void release_confirmed_frame_cache(Frames& frames){
    for(auto& frame:frames)if(!frame.valid&&!frame.captured){
        using State=std::decay_t<decltype(frame.state)>;
        frame.state=State{};
    }
}
}
