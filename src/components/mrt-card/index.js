import React from 'react'
import './index.css'
import { Card } from 'antd'
import { LikeOutlined, DislikeOutlined, PullRequestOutlined, ShareAltOutlined, CloseOutlined } from '@ant-design/icons'

export default class MRTCard extends React.Component {
    render() {
        const title = <div className="title">{this.props.paper.title}</div>
        const description = this.props.paper.abstract
        const extra = <CloseOutlined className="close-button" onClick={() => this.props.onCardClose()}/>
        return (
            <div className="mrt-card" onDoubleClick={() => console.log('click')}>
                <Card
                    style={{ marginTop: 16 }}
                    actions={[
                        <LikeOutlined type="like"/>,
                        <DislikeOutlined type="dislike"/>,
                        <PullRequestOutlined type="pull-request"/>,
                        <ShareAltOutlined type="share-alt"/>,
                    ]}
                    extra={extra}
                    title={title}
                >
                    <Card.Meta
                        description={description}
                    />
                </Card>
            </div>)
    }
}